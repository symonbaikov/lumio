import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CryptoWallet } from '../../entities/crypto-wallet.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CryptoPriceService } from './crypto-price.service';
import type { WalletSyncResult } from './crypto-sync.service';
import { CryptoSyncService } from './crypto-sync.service';
import { addDecimals } from './crypto-transfer.mapper';
import { CHAIN_NAMES, DEFAULT_CHAIN_ID } from './crypto.constants';
import type { ConnectCryptoWalletDto } from './dto/connect-crypto-wallet.dto';

export interface CryptoWalletView {
  id: string;
  address: string;
  chainId: number;
  chainName: string;
  label: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  transactionCount: number;
}

export interface CryptoHolding {
  asset: string;
  /** Net native amount held, as a decimal string. */
  amount: string;
  /** Current value in the workspace currency. */
  value: number;
}

export interface CryptoSummary {
  currency: string;
  /** Current value of every holding, in the workspace currency. */
  portfolioValue: number;
  /** Booked value of incoming transfers over the window. */
  income: number;
  /** Booked value of outgoing transfers, including gas, over the window. */
  expense: number;
  walletCount: number;
  holdings: CryptoHolding[];
}

@Injectable()
export class CryptoService {
  constructor(
    @InjectRepository(CryptoWallet)
    private readonly walletRepo: Repository<CryptoWallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly syncService: CryptoSyncService,
    private readonly priceService: CryptoPriceService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async findAll(workspaceId: string): Promise<CryptoWalletView[]> {
    const wallets = await this.walletRepo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });

    const counts = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.crypto_wallet_id', 'walletId')
      .addSelect('COUNT(*)', 'count')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.crypto_wallet_id IS NOT NULL')
      .groupBy('t.crypto_wallet_id')
      .getRawMany<{ walletId: string; count: string }>();

    const countByWallet = new Map(counts.map(row => [row.walletId, Number(row.count)]));

    return wallets.map(wallet => ({
      id: wallet.id,
      address: wallet.address,
      chainId: wallet.chainId,
      chainName: CHAIN_NAMES[wallet.chainId] ?? 'Blockchain',
      label: wallet.label,
      lastSyncedAt: wallet.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: wallet.lastSyncError,
      transactionCount: countByWallet.get(wallet.id) ?? 0,
    }));
  }

  async connect(
    workspaceId: string,
    userId: string,
    dto: ConnectCryptoWalletDto,
  ): Promise<CryptoWalletView> {
    const address = dto.address.toLowerCase();
    const chainId = dto.chainId ?? DEFAULT_CHAIN_ID;

    const existing = await this.walletRepo.findOne({ where: { workspaceId, chainId, address } });
    if (existing) {
      throw new ConflictException('This address is already connected to the workspace');
    }

    const wallet = await this.walletRepo.save(
      this.walletRepo.create({
        workspaceId,
        address,
        chainId,
        label: dto.label ?? null,
        connectedByUserId: userId,
      }),
    );

    // A freshly connected wallet with no history looks broken, so pull it now.
    // A sync failure must not lose the connection the user just made.
    await this.syncService.syncWallet(wallet).catch(() => undefined);

    const views = await this.findAll(workspaceId);
    const view = views.find(item => item.id === wallet.id);
    if (!view) {
      throw new NotFoundException('Crypto wallet not found');
    }
    return view;
  }

  async sync(workspaceId: string, walletId: string): Promise<WalletSyncResult> {
    const wallet = await this.getOwnedWallet(workspaceId, walletId);
    return this.syncService.syncWallet(wallet);
  }

  /** Removes the wallet; its transactions go with it via ON DELETE CASCADE. */
  async remove(workspaceId: string, walletId: string): Promise<void> {
    const wallet = await this.getOwnedWallet(workspaceId, walletId);
    await this.walletRepo.delete(wallet.id);
  }

  async getSummary(workspaceId: string, days = 30): Promise<CryptoSummary> {
    const currency = await this.getWorkspaceCurrency(workspaceId);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [walletCount, flows, holdings] = await Promise.all([
      this.walletRepo.count({ where: { workspaceId } }),
      this.getFlows(workspaceId, since),
      this.getHoldings(workspaceId, currency),
    ]);

    return {
      currency,
      portfolioValue: round2(holdings.reduce((total, holding) => total + holding.value, 0)),
      income: flows.income,
      expense: flows.expense,
      walletCount,
      holdings,
    };
  }

  private async getFlows(
    workspaceId: string,
    since: Date,
  ): Promise<{ income: number; expense: number }> {
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.transaction_type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.crypto_wallet_id IS NOT NULL')
      .andWhere('t.transaction_date >= :since', { since })
      .groupBy('t.transaction_type')
      .getRawMany<{ type: TransactionType; total: string }>();

    const totalFor = (type: TransactionType): number =>
      round2(Number(rows.find(row => row.type === type)?.total ?? 0));

    return {
      income: totalFor(TransactionType.INCOME),
      expense: totalFor(TransactionType.EXPENSE),
    };
  }

  /**
   * Holdings are derived from the booked transfers rather than read from the chain:
   * the same rows that drive the dashboard also decide what the portfolio is worth,
   * so the two can never disagree.
   *
   * ponytail: this misses assets acquired before the synced window and any balance
   * change that is not a transfer (staking rewards accrued in-place, rebasing
   * tokens). Read live balances from the chain if that gap starts to matter.
   */
  private async getHoldings(workspaceId: string, currency: string): Promise<CryptoHolding[]> {
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.crypto_asset', 'asset')
      .addSelect('t.transaction_type', 'type')
      .addSelect('t.crypto_amount', 'amount')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.crypto_wallet_id IS NOT NULL')
      .andWhere('t.crypto_asset IS NOT NULL')
      .getRawMany<{ asset: string; type: TransactionType; amount: string }>();

    if (rows.length === 0) {
      return [];
    }

    const netByAsset = new Map<string, string>();
    for (const row of rows) {
      const signed = row.type === TransactionType.INCOME ? row.amount : `-${row.amount}`;
      netByAsset.set(row.asset, addDecimals(netByAsset.get(row.asset) ?? '0', signed));
    }

    const usdPrices = await this.priceService.getCurrentUsdPrices([...netByAsset.keys()]);
    const usdToCurrency = await this.exchangeRatesService.getRate('USD', currency);

    return [...netByAsset.entries()]
      .filter(([, amount]) => Number(amount) > 0)
      .map(([asset, amount]) => ({
        asset,
        amount,
        value: round2(Number(amount) * (usdPrices[asset] ?? 0) * usdToCurrency),
      }))
      .sort((a, b) => b.value - a.value);
  }

  private async getOwnedWallet(workspaceId: string, walletId: string): Promise<CryptoWallet> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId, workspaceId } });
    if (!wallet) {
      throw new NotFoundException('Crypto wallet not found');
    }
    return wallet;
  }

  private async getWorkspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'currency'],
    });
    return workspace?.currency ?? 'USD';
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
