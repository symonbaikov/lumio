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
  type EtherscanTokenTx,
  type EtherscanTx,
  mapChainTransfers,
} from './crypto-transfer.mapper';
import { CHAIN_NAMES, NATIVE_ASSET_BY_CHAIN } from './crypto.constants';

/**
 * Blockscout's hosted Ethereum mainnet explorer mirrors Etherscan's account API
 * (same actions, same field names) but needs no API key, so wallet sync works with
 * zero setup. Its anonymous rate limit is a few hundred requests/minute — plenty for
 * per-wallet syncs, but a ceiling worth knowing about.
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
    const [transactions, tokenTransfers, ownAddresses, currency] = await Promise.all([
      this.fetchEtherscan<EtherscanTx>(wallet, 'txlist'),
      this.fetchEtherscan<EtherscanTokenTx>(wallet, 'tokentx'),
      this.getWorkspaceAddresses(wallet.workspaceId, wallet.chainId),
      this.getWorkspaceCurrency(wallet.workspaceId),
    ]);

    const transfers = mapChainTransfers({
      address: wallet.address,
      nativeAsset,
      ownAddresses,
      transactions,
      tokenTransfers,
    });

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

    const response = await fetch(`${BLOCK_EXPLORER_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Block explorer ${action} returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      status: string;
      message: string;
      result: T[] | string;
    };

    if (typeof data.result === 'string') {
      // "No transactions found" comes back as status 0 with a string result and is
      // an empty wallet, not a failure. Anything else is a real error.
      if (data.message?.includes('No transactions found')) {
        return [];
      }
      throw new Error(`Block explorer ${action} error: ${data.result}`);
    }

    return data.result;
  }
}

function shortenAddress(address: string): string {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
