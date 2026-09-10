import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CryptoWallet } from '../../entities/crypto-wallet.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CryptoPriceService } from './crypto-price.service';
import {
  type ChainTransfer,
  type EtherscanTokenBalance,
  type EtherscanTokenTx,
  type EtherscanTx,
  mapChainTransfers,
  mapWalletBalances,
} from './crypto-transfer.mapper';
import { CHAIN_NAMES, NATIVE_ASSET_BY_CHAIN, TICKER_BY_CONTRACT } from './crypto.constants';
import { MAX_ATTEMPTS, isTransient, retryWaitMs, sleep } from './retry.util';

/**
 * Blockscout's hosted Ethereum mainnet explorer mirrors Etherscan's account API
 * (same actions, same field names) but needs no API key, so wallet sync works with
 * zero setup.
 *
 * Its anonymous budget is small: the host answers with `x-ratelimit-limit: 10` over
 * a window of roughly forty minutes, and one wallet sync spends four of those. That
 * is comfortable for the six-hourly cron plus the occasional manual refresh, and
 * tight for anything more, so the manual endpoint is throttled too.
 *
 * ponytail: single free provider, no fallback. Point this at Etherscan (with a key)
 * or add a second provider if Blockscout's limit or uptime ever becomes a problem.
 */
const BLOCK_EXPLORER_BASE_URL = 'https://eth.blockscout.com/api';
/**
 * ponytail: newest-N window instead of a stored block cursor. Re-reading rows we
 * already have is free (the unique index absorbs them), so this is only a ceiling
 * for a wallet that makes more than 1000 transfers between two syncs. Add a
 * `last_synced_block` column if that ever happens.
 */
const MAX_ROWS_PER_SYNC = 1000;
const ONE_DAY_SECONDS = 86_400;

export interface WalletSyncResult {
  imported: number;
  skipped: number;
}

@Injectable()
export class CryptoSyncService {
  private readonly logger = new Logger(CryptoSyncService.name);

  constructor(
    @InjectRepository(CryptoWallet)
    private readonly walletRepo: Repository<CryptoWallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly priceService: CryptoPriceService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  @Cron('0 */6 * * *')
  async syncAllWallets(): Promise<void> {
    const wallets = await this.walletRepo.find({ where: { isActive: true } });
    this.logger.log(`Syncing ${wallets.length} crypto wallet(s)`);

    for (const wallet of wallets) {
      // One bad wallet must not stop the rest of the workspace's sync.
      await this.syncWallet(wallet).catch(error => {
        this.logger.warn(`Sync failed for wallet ${wallet.id}: ${String(error)}`);
      });
    }
  }

  async syncWallet(wallet: CryptoWallet): Promise<WalletSyncResult> {
    try {
      const result = await this.runSync(wallet);
      await this.walletRepo.update(wallet.id, {
        lastSyncedAt: new Date(),
        lastSyncError: null,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.walletRepo.update(wallet.id, { lastSyncError: message });
      throw error;
    }
  }

  private async runSync(wallet: CryptoWallet): Promise<WalletSyncResult> {
    const nativeAsset = NATIVE_ASSET_BY_CHAIN[wallet.chainId] ?? 'ETH';
    // Which contracts count as real money on this chain. A chain we have no table
    // for prices no tokens at all, which is safer than trusting another chain's.
    const tickerByContract = TICKER_BY_CONTRACT[wallet.chainId] ?? {};
    // Balances are fetched alongside the transfers rather than after them: if the
    // explorer is unreachable the whole sync fails and the stored balances stay as
    // they were, instead of being half-updated from a partial read.
    const [transactions, tokenTransfers, nativeBalance, tokenBalances, ownAddresses, currency] =
      await Promise.all([
        this.fetchEtherscan<EtherscanTx>(wallet, 'txlist'),
        this.fetchEtherscan<EtherscanTokenTx>(wallet, 'tokentx'),
        this.fetchNativeBalance(wallet),
        this.fetchTokenBalances(wallet),
        this.getWorkspaceAddresses(wallet.workspaceId, wallet.chainId),
        this.getWorkspaceCurrency(wallet.workspaceId),
      ]);

    // Balances are stored the moment they are read, before the ledger work that can
    // fail on a rate-limited price lookup. The portfolio value is balances times
    // current prices, so a historical-price outage has no business freezing it.
    const balances = mapWalletBalances({
      nativeAsset,
      nativeBalance,
      tickerByContract,
      tokens: tokenBalances,
    });
    await this.walletRepo.update(wallet.id, { balances });

    const transfers = mapChainTransfers({
      address: wallet.address,
      nativeAsset,
      ownAddresses,
      tickerByContract,
      transactions,
      tokenTransfers,
    });

    await this.primePrices(transfers);

    let imported = 0;
    let skipped = 0;

    for (const transfer of transfers) {
      const inserted = await this.persistTransfer(wallet, transfer, currency);
      if (inserted) {
        imported += 1;
      } else {
        skipped += 1;
      }
    }

    return { imported, skipped };
  }

  /**
   * Caches every price the transfers will need, one request per asset. Pricing each
   * transfer's date on its own burned a request per date, and the provider's free
   * tier stops answering after five a minute — which used to leave the rest of the
   * transfers unpriced and silently dropped.
   */
  private async primePrices(transfers: ChainTransfer[]): Promise<void> {
    const earliest = transfers[0];
    if (!earliest) {
      return;
    }

    // `mapChainTransfers` returns oldest first; a day of padding makes sure the
    // first transfer's own date falls inside the window.
    const from = new Date((earliest.timestamp - ONE_DAY_SECONDS) * 1000);
    await this.priceService.primeHistoricalPrices(
      transfers.map(transfer => transfer.asset),
      from,
      new Date(),
    );
  }

  /** The address's current native-coin balance, in wei. */
  private async fetchNativeBalance(wallet: CryptoWallet): Promise<string> {
    const data = await this.explorerGet({
      module: 'account',
      action: 'balance',
      address: wallet.address,
    });

    // A balance we could not read must not be mistaken for a balance of zero.
    if (data.status !== '1' || typeof data.result !== 'string') {
      throw new Error(`Block explorer balance error: ${String(data.result ?? data.message)}`);
    }
    return data.result;
  }

  /** The address's current token balances. An address holding none returns no rows. */
  private async fetchTokenBalances(wallet: CryptoWallet): Promise<EtherscanTokenBalance[]> {
    const data = await this.explorerGet({
      module: 'account',
      action: 'tokenlist',
      address: wallet.address,
    });

    // "No tokens found" comes back as a string result and is an empty wallet, not
    // a failure — the same shape `txlist` uses for an address with no history.
    return Array.isArray(data.result) ? (data.result as EtherscanTokenBalance[]) : [];
  }

  /**
   * Returns true when a new row was written. A transfer we already hold, or one
   * whose asset cannot be priced, is skipped rather than booked at zero.
   */
  private async persistTransfer(
    wallet: CryptoWallet,
    transfer: ChainTransfer,
    currency: string,
  ): Promise<boolean> {
    const date = new Date(transfer.timestamp * 1000);
    const usdPrice = await this.priceService.getUsdPrice(transfer.asset, date);
    if (usdPrice === null) {
      return false;
    }

    const usdValue = Number(transfer.amount) * usdPrice;
    const { converted } = await this.exchangeRatesService.convert(usdValue, 'USD', currency, date);
    const fiatAmount = Math.round(converted * 100) / 100;
    const isIncome = transfer.direction === 'in';

    const result = await this.transactionRepo
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values({
        workspaceId: wallet.workspaceId,
        cryptoWalletId: wallet.id,
        cryptoAsset: transfer.asset,
        cryptoAmount: transfer.amount,
        cryptoTxHash: transfer.hash,
        transactionDate: date,
        counterpartyName: shortenAddress(transfer.counterparty) || 'Unknown address',
        counterpartyAccount: transfer.counterparty || null,
        counterpartyBank: CHAIN_NAMES[wallet.chainId] ?? 'Blockchain',
        paymentPurpose: `${transfer.direction === 'in' ? 'Received' : 'Sent'} ${transfer.amount} ${transfer.asset}`,
        amount: fiatAmount,
        debit: isIncome ? null : fiatAmount,
        credit: isIncome ? fiatAmount : null,
        currency,
        transactionType: isIncome ? TransactionType.INCOME : TransactionType.EXPENSE,
        documentNumber: transfer.hash,
        isVerified: true,
      })
      .orIgnore()
      .execute();

    // `ON CONFLICT DO NOTHING` returns no row when the unique index rejected the
    // insert, which is exactly how a repeated sync stays idempotent.
    return Array.isArray(result.raw) && result.raw.length > 0;
  }

  /** Every address the workspace watches on this chain — the internal-transfer filter. */
  private async getWorkspaceAddresses(workspaceId: string, chainId: number): Promise<string[]> {
    const wallets = await this.walletRepo.find({
      where: { workspaceId, chainId },
      select: ['address'],
    });
    return wallets.map(wallet => wallet.address);
  }

  private async getWorkspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'currency'],
    });
    return workspace?.currency ?? 'USD';
  }

  private async fetchEtherscan<T>(
    wallet: CryptoWallet,
    action: 'txlist' | 'tokentx',
  ): Promise<T[]> {
    const params = new URLSearchParams({
      module: 'account',
      action,
      address: wallet.address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(MAX_ROWS_PER_SYNC),
      sort: 'desc',
    });

    const data = await this.explorerGet(params);

    if (typeof data.result === 'string') {
      // "No transactions found" comes back as status 0 with a string result and is
      // an empty wallet, not a failure. Anything else is a real error.
      if (data.message?.includes('No transactions found')) {
        return [];
      }
      throw new Error(`Block explorer ${action} error: ${data.result}`);
    }

    return data.result as T[];
  }

  /**
   * One sync asks the explorer four questions, and its anonymous budget is shared
   * with everyone else using the public host, so a refusal is retried rather than
   * failing the whole wallet on a moment's bad luck.
   */
  private async explorerGet(
    params: URLSearchParams | Record<string, string>,
  ): Promise<ExplorerResponse> {
    const query = new URLSearchParams(params).toString();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(`${BLOCK_EXPLORER_BASE_URL}?${query}`).catch(() => null);

      if (response?.ok) {
        return (await response.json()) as ExplorerResponse;
      }

      const wait = isTransient(response) ? retryWaitMs(response, attempt) : null;
      if (wait === null || attempt === MAX_ATTEMPTS - 1) {
        throw new Error(
          response
            ? `Block explorer returned HTTP ${response.status}`
            : 'Block explorer is unreachable',
        );
      }

      this.logger.warn(`Block explorer returned ${response?.status}, retrying in ${wait}ms`);
      await sleep(wait);
    }

    throw new Error('Block explorer is unreachable');
  }
}

interface ExplorerResponse {
  status: string;
  message: string;
  result: unknown[] | string;
}

function shortenAddress(address: string): string {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
