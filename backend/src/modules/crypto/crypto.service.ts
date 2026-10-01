import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { CryptoWallet } from '../../entities/crypto-wallet.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { AuditService } from '../audit/audit.service';
import type { CreateAuditEventDto } from '../audit/interfaces/audit-event.interface';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  CHAIN_NAMES,
  CHAINS,
  type ChainFamily,
  chainIdForAddress,
  familyForAddress,
  normalizeAddress,
  SUPPORTED_CHAIN_IDS,
} from './crypto.constants';
import { CryptoPriceService } from './crypto-price.service';
import type { WalletSyncResult } from './crypto-sync.service';
import { CryptoSyncService } from './crypto-sync.service';
import { addDecimals } from './crypto-transfer.mapper';
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
  /** Amount held on-chain, as a decimal string. */
  amount: string;
  /** Current price of one unit, in the workspace currency. */
  price: number;
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
  /**
   * Percent change of the portfolio against yesterday's daily prices, holding
   * today's amounts fixed — the price move only. Null when yesterday's price is
   * missing for any holding, so a partial figure is never shown as the whole.
   */
  portfolioChangeSinceYesterday: number | null;
}

export interface CryptoTransactionView {
  id: string;
  date: string;
  walletId: string;
  walletLabel: string | null;
  walletAddress: string | null;
  walletChainName: string | null;
  direction: 'in' | 'out';
  asset: string | null;
  cryptoAmount: string | null;
  /** Booked value in `currency`. */
  amount: number;
  currency: string;
  counterparty: string | null;
  txHash: string | null;
}

function daysAgo(days: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

/** `2026-08` → from `2026-08-01` up to, not including, `2026-09-01`. */
function monthWindow(month: string): { since: string; until: string } {
  const [year, monthIndex] = month.split('-').map(Number);
  const next =
    monthIndex === 12 ? `${year + 1}-01` : `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return { since: `${month}-01`, until: `${next}-01` };
}
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

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
    private readonly auditService: AuditService,
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

  /**
   * Connects one address on one or more networks and returns the wallets created.
   * Networks where the address is already connected are skipped; only when every
   * requested network is taken is that a conflict.
   */
  async connect(
    workspaceId: string,
    userId: string,
    dto: ConnectCryptoWalletDto,
  ): Promise<CryptoWalletView[]> {
    const family = familyForAddress(dto.address);
    const defaultChainId = chainIdForAddress(dto.address);
    const chainIds = [...new Set(dto.chainIds ?? [dto.chainId ?? defaultChainId])];
    // An address of one family on another family's chain would sync nothing, or
    // another address's history if the formats ever collided.
    if (!family || chainIds.some(id => id === null || CHAINS[id]?.family !== family)) {
      throw new BadRequestException('The address does not belong to the selected network');
    }

    const created: CryptoWallet[] = [];
    for (const chainId of chainIds as number[]) {
      const address = normalizeAddress(dto.address, chainId);
      const existing = await this.walletRepo.findOne({ where: { workspaceId, chainId, address } });
      if (existing) {
        continue;
      }
      created.push(
        await this.walletRepo.save(
          this.walletRepo.create({
            workspaceId,
            address,
            chainId,
            label: dto.label ?? null,
            connectedByUserId: userId,
          }),
        ),
      );
    }
    if (created.length === 0) {
      throw new ConflictException('This address is already connected to the workspace');
    }

    await this.recordAudit(
      created.map(wallet => ({
        workspaceId,
        actorType: ActorType.USER,
        actorId: userId,
        entityType: EntityType.CRYPTO_WALLET,
        entityId: wallet.id,
        action: AuditAction.CREATE,
        diff: { before: null, after: walletAuditSnapshot(wallet) },
        meta: { chain: CHAIN_NAMES[wallet.chainId] ?? null, chainId: wallet.chainId },
      })),
    );

    // A freshly connected wallet with no history looks broken, so pull it now —
    // every chain at once, since each has its own provider. A sync failure must
    // not lose the connection the user just made.
    await Promise.all(
      created.map(wallet => this.syncService.syncWallet(wallet).catch(() => undefined)),
    );

    const createdIds = new Set(created.map(wallet => wallet.id));
    return (await this.findAll(workspaceId)).filter(view => createdIds.has(view.id));
  }

  /** The networks a wallet can be connected on, for the connect form. */
  getNetworks(): { chainId: number; name: string; family: ChainFamily; nativeAsset: string }[] {
    return SUPPORTED_CHAIN_IDS.map(chainId => ({
      chainId,
      name: CHAINS[chainId].name,
      family: CHAINS[chainId].family,
      nativeAsset: CHAINS[chainId].nativeAsset,
    }));
  }

  async sync(workspaceId: string, walletId: string, userId: string): Promise<WalletSyncResult> {
    const wallet = await this.getOwnedWallet(workspaceId, walletId);
    const result = await this.syncService.syncWallet(wallet);
    // A sync that found nothing new changed nothing worth a log entry.
    if (result.imported > 0) {
      await this.recordAudit([
        {
          workspaceId,
          actorType: ActorType.USER,
          actorId: userId,
          entityType: EntityType.CRYPTO_WALLET,
          entityId: wallet.id,
          action: AuditAction.IMPORT,
          meta: {
            count: result.imported,
            skipped: result.skipped,
            chain: CHAIN_NAMES[wallet.chainId] ?? null,
            address: shortenAddress(wallet.address),
          },
        },
      ]);
    }
    return result;
  }

  /** Removes the wallet; its transactions go with it via ON DELETE CASCADE. */
  async remove(workspaceId: string, walletId: string, userId: string): Promise<void> {
    const wallet = await this.getOwnedWallet(workspaceId, walletId);
    const transactionCount = await this.transactionRepo.count({
      where: { workspaceId, cryptoWalletId: wallet.id },
    });
    await this.walletRepo.delete(wallet.id);
    await this.recordAudit([
      {
        workspaceId,
        actorType: ActorType.USER,
        actorId: userId,
        entityType: EntityType.CRYPTO_WALLET,
        entityId: wallet.id,
        action: AuditAction.DELETE,
        diff: { before: walletAuditSnapshot(wallet), after: null },
        meta: { chain: CHAIN_NAMES[wallet.chainId] ?? null, transactionCount },
      },
    ]);
  }

  // Several wallets from one connect share a batch; an audit failure never fails the call.
  private async recordAudit(events: CreateAuditEventDto[]): Promise<void> {
    try {
      if (events.length === 1) {
        await this.auditService.createEvent(events[0]);
      } else {
        await this.auditService.createBatchEvents(events, randomUUID());
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Audit event failed for crypto wallet(s): ${message}`);
    }
  }

  /**
   * `month` (`YYYY-MM`) swaps the rolling window for that calendar month, so the
   * dashboard can compare how much came in and went out month by month. The
   * portfolio value stays the current one either way.
   */
  async getSummary(workspaceId: string, days = 30, month?: string): Promise<CryptoSummary> {
    const currency = await this.getWorkspaceCurrency(workspaceId);
    const window = month ? monthWindow(month) : { since: daysAgo(days), until: null };

    const [walletCount, flows, holdings] = await Promise.all([
      this.walletRepo.count({ where: { workspaceId } }),
      this.getFlows(workspaceId, window.since, window.until),
      this.getHoldings(workspaceId, currency),
    ]);

    return {
      currency,
      portfolioValue: round2(holdings.reduce((total, holding) => total + holding.value, 0)),
      income: flows.income,
      expense: flows.expense,
      walletCount,
      holdings,
      portfolioChangeSinceYesterday: await this.getPortfolioChangeSinceYesterday(
        holdings,
        currency,
        workspaceId,
      ),
    };
  }

  /** The most recent booked transfers across the workspace's wallets, newest first. */
  async getRecentTransactions(workspaceId: string, limit = 20): Promise<CryptoTransactionView[]> {
    const [transactions, wallets] = await Promise.all([
      this.transactionRepo
        .createQueryBuilder('t')
        .where('t.workspace_id = :workspaceId', { workspaceId })
        .andWhere('t.crypto_wallet_id IS NOT NULL')
        .orderBy('t.transaction_date', 'DESC')
        .addOrderBy('t.id', 'DESC')
        .take(limit)
        .getMany(),
      this.walletRepo.find({
        where: { workspaceId },
        select: ['id', 'label', 'address', 'chainId'],
      }),
    ]);
    const walletById = new Map(wallets.map(wallet => [wallet.id, wallet]));

    return transactions.map(transaction => {
      const wallet = walletById.get(transaction.cryptoWalletId as string);
      return {
        id: transaction.id,
        date: new Date(transaction.transactionDate).toISOString(),
        walletId: transaction.cryptoWalletId as string,
        walletLabel: wallet?.label ?? null,
        walletAddress: wallet?.address ?? null,
        walletChainName: wallet ? (CHAIN_NAMES[wallet.chainId] ?? null) : null,
        direction: transaction.transactionType === TransactionType.INCOME ? 'in' : 'out',
        asset: transaction.cryptoAsset,
        cryptoAmount: transaction.cryptoAmount,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        counterparty: transaction.counterpartyAccount ?? transaction.counterpartyName ?? null,
        txHash: transaction.cryptoTxHash,
      };
    });
  }

  /**
   * Yesterday's daily price is fetched once and then read from the cache the sync
   * fills. It is converted at today's rate, the same rate the current values use,
   * so the ratio is the price move alone. A price that cannot be fetched right now
   * (rate limit) hides the figure instead of failing the whole summary.
   */
  private async getPortfolioChangeSinceYesterday(
    holdings: CryptoHolding[],
    currency: string,
    workspaceId: string,
  ): Promise<number | null> {
    if (holdings.length === 0) {
      return null;
    }
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usdToCurrency = await this.exchangeRatesService.getRate(
      'USD',
      currency,
      undefined,
      workspaceId,
    );

    let now = 0;
    let before = 0;
    for (const holding of holdings) {
      const pastUsd = await this.priceService.getUsdPrice(holding.asset, dayAgo).catch(() => null);
      if (pastUsd === null) {
        return null;
      }
      now += holding.value;
      before += Number(holding.amount) * pastUsd * usdToCurrency;
    }
    if (before === 0) {
      return null;
    }
    return Math.round(((now - before) / before) * 10000) / 100;
  }

  private async getFlows(
    workspaceId: string,
    since: Date | string,
    until: string | null,
  ): Promise<{ income: number; expense: number }> {
    const query = this.transactionRepo
      .createQueryBuilder('t')
      .select('t.transaction_type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.crypto_wallet_id IS NOT NULL')
      .andWhere('t.transaction_date >= :since', { since });
    if (until) {
      query.andWhere('t.transaction_date < :until', { until });
    }
    const rows = await query
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
   * Holdings are the balances the last sync read off the chain, summed across the
   * workspace's wallets. They are deliberately NOT derived from the booked
   * transfers: a transfer that fails to import (an unpriceable asset, a rate-limited
   * price lookup) would otherwise move the portfolio silently, and a balance that
   * changed without a transfer — staking accrued in place, a rebasing token — would
   * never show up at all.
   *
   * An asset we cannot price is dropped rather than counted at zero, which is also
   * what keeps airdropped spam tokens out of the total.
   */
  private async getHoldings(workspaceId: string, currency: string): Promise<CryptoHolding[]> {
    const wallets = await this.walletRepo.find({
      where: { workspaceId },
      select: ['id', 'balances'],
    });

    const amountByAsset = new Map<string, string>();
    for (const wallet of wallets) {
      for (const balance of wallet.balances ?? []) {
        amountByAsset.set(
          balance.asset,
          addDecimals(amountByAsset.get(balance.asset) ?? '0', balance.amount),
        );
      }
    }

    if (amountByAsset.size === 0) {
      return [];
    }

    const usdPrices = await this.priceService.getCurrentUsdPrices([...amountByAsset.keys()]);
    const usdToCurrency = await this.exchangeRatesService.getRate(
      'USD',
      currency,
      undefined,
      workspaceId,
    );

    return [...amountByAsset.entries()]
      .filter(([asset, amount]) => Number(amount) > 0 && usdPrices[asset] !== undefined)
      .map(([asset, amount]) => ({
        asset,
        amount,
        price: round2(usdPrices[asset] * usdToCurrency),
        value: round2(Number(amount) * usdPrices[asset] * usdToCurrency),
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

/** Plain wallet fields for the audit diff, with the address shortened. */
function walletAuditSnapshot(wallet: CryptoWallet): Record<string, unknown> {
  return {
    address: shortenAddress(wallet.address),
    chainId: wallet.chainId,
    chainName: CHAIN_NAMES[wallet.chainId] ?? null,
    label: wallet.label ?? null,
  };
}

function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
