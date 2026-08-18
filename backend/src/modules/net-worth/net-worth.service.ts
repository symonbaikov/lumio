import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import {
  BalanceAccount,
  BalanceAccountType,
  BalanceSnapshot,
  CapitalRole,
  RiskLevel,
  Statement,
  StatementStatus,
  Transaction,
  Wallet,
  Workspace,
  WorkspaceMember,
} from '../../entities';
import { BalanceService, CASH_ACCOUNT_CODE } from '../balance/balance.service';
import type { NetWorthRange } from './dto/net-worth-query.dto';

export interface NetWorthPoint {
  date: string;
  value: number;
}

export interface NetWorthBreakdownItem {
  code: string;
  name: string;
  amount: number;
  percent: number;
}

/** One bucket of a classification split. `key` is null for what is unlabelled. */
export interface NetWorthClassificationItem {
  key: string | null;
  amount: number;
  percent: number;
}

/** An asset line the user can classify, with what it is currently worth. */
export interface NetWorthAssetLine {
  id: string;
  code: string;
  name: string;
  amount: number;
  capitalRole: CapitalRole | null;
  riskLevel: RiskLevel | null;
  /** False for cash, whose risk is fixed rather than chosen. */
  isClassifiable: boolean;
}

export interface NetWorthResponse {
  range: NetWorthRange;
  currency: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
  assetsTotal: number;
  liabilitiesTotal: number;
  series: NetWorthPoint[];
  breakdown: NetWorthBreakdownItem[];
  byRisk: NetWorthClassificationItem[];
  byRole: NetWorthClassificationItem[];
  /** Share of assets sitting in medium or high risk. */
  riskyPercent: number;
  assetLines: NetWorthAssetLine[];
}

/** Days back from today for each range. `all` is resolved from the data. */
const RANGE_DAYS: Record<Exclude<NetWorthRange, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
  '5y': 365 * 5,
};

/**
 * How many points a series carries. Net worth moves when a snapshot is
 * entered or money moves — not continuously — so a readable line needs far
 * fewer points than it needs days, and every extra point costs a walk over
 * the snapshot history.
 */
const SERIES_POINTS = 13;

/** Nothing to chart yet: `all` on an empty workspace falls back to a year. */
const EMPTY_WORKSPACE_DAYS = 365;

/**
 * Net worth over time — what the workspace owns minus what it owes.
 *
 * Reads the balance sheet's own data (balance_accounts + balance_snapshots)
 * rather than introducing a parallel notion of assets: a value entered on the
 * balance sheet shows up here, and vice versa. Equity accounts are excluded on
 * purpose — equity is the balancing side of the sheet, not a debt, and
 * subtracting it would net the number to roughly zero.
 */
@Injectable()
export class NetWorthService {
  constructor(
    @InjectRepository(BalanceAccount)
    private readonly balanceAccountRepository: Repository<BalanceAccount>,
    @InjectRepository(BalanceSnapshot)
    private readonly balanceSnapshotRepository: Repository<BalanceSnapshot>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly balanceService: BalanceService,
  ) {}

  async getNetWorth(
    workspaceId: string,
    range: NetWorthRange = '90d',
    locale?: string,
  ): Promise<NetWorthResponse> {
    await this.balanceService.seedDefaultAccounts(workspaceId);

    const to = isoDate(new Date());
    const from = await this.resolveFrom(workspaceId, range, to);
    const dates = samplePoints(from, to, SERIES_POINTS);

    const [accounts, snapshots, cashByDate, currency] = await Promise.all([
      this.balanceAccountRepository.find({ where: { workspaceId } }),
      this.loadSnapshots(workspaceId, to),
      this.loadCashSeries(workspaceId, dates),
      this.resolveCurrency(workspaceId),
    ]);

    const leaves = findLeaves(accounts);
    const snapshotsByAccount = groupSnapshots(snapshots);

    const valueAt = (accountId: string, code: string, date: string): number =>
      code === CASH_ACCOUNT_CODE
        ? (cashByDate.get(date) ?? 0)
        : latestOnOrBefore(snapshotsByAccount.get(accountId), date);

    const series = dates.map(date => {
      let assets = 0;
      let liabilities = 0;
      for (const leaf of leaves) {
        if (leaf.accountType === BalanceAccountType.ASSET) {
          assets += valueAt(leaf.id, leaf.code, date);
        } else if (leaf.accountType === BalanceAccountType.LIABILITY) {
          liabilities += valueAt(leaf.id, leaf.code, date);
        }
      }
      return { date, value: round2(assets - liabilities) };
    });

    const assetsTotal = round2(
      leaves
        .filter(leaf => leaf.accountType === BalanceAccountType.ASSET)
        .reduce((sum, leaf) => sum + valueAt(leaf.id, leaf.code, to), 0),
    );
    const liabilitiesTotal = round2(
      leaves
        .filter(leaf => leaf.accountType === BalanceAccountType.LIABILITY)
        .reduce((sum, leaf) => sum + valueAt(leaf.id, leaf.code, to), 0),
    );

    const current = series[series.length - 1]?.value ?? 0;
    const previous = series[0]?.value ?? 0;
    const change = round2(current - previous);

    const assetLines = leaves
      .filter(leaf => leaf.accountType === BalanceAccountType.ASSET)
      .map(leaf => ({
        id: leaf.id,
        code: leaf.code,
        name: resolveName(leaf, locale),
        amount: round2(valueAt(leaf.id, leaf.code, to)),
        // Cash answers for itself: always low risk, never the user's call.
        capitalRole: leaf.capitalRole,
        riskLevel: leaf.code === CASH_ACCOUNT_CODE ? RiskLevel.LOW : leaf.riskLevel,
        isClassifiable: leaf.code !== CASH_ACCOUNT_CODE,
      }))
      .sort((a, b) => b.amount - a.amount);

    const byRisk = groupBy(assetLines, line => line.riskLevel, assetsTotal);
    const byRole = groupBy(assetLines, line => line.capitalRole, assetsTotal);

    return {
      range,
      currency,
      current,
      previous,
      change,
      // A percentage of zero says nothing, and a percentage of a negative
      // starting point says something misleading — omit it in both cases.
      changePercent: previous > 0 ? round2((change / previous) * 100) : null,
      assetsTotal,
      liabilitiesTotal,
      series,
      breakdown: this.buildBreakdown(accounts, leaves, valueAt, to, assetsTotal, locale),
      byRisk,
      byRole,
      // Deliberately a share of *all* assets, not just the classified ones:
      // counting unlabelled capital as risky would raise alarms about data
      // nobody has looked at yet. The figure can only understate the risk,
      // which is the safe direction for it to be wrong in.
      riskyPercent: round2(
        byRisk
          .filter(item => item.key === RiskLevel.MEDIUM || item.key === RiskLevel.HIGH)
          .reduce((sum, item) => sum + item.percent, 0),
      ),
      assetLines,
    };
  }

  /** Asset totals grouped under the top-level section each leaf belongs to. */
  private buildBreakdown(
    accounts: BalanceAccount[],
    leaves: BalanceAccount[],
    valueAt: (accountId: string, code: string, date: string) => number,
    date: string,
    assetsTotal: number,
    locale?: string,
  ): NetWorthBreakdownItem[] {
    const byId = new Map(accounts.map(account => [account.id, account]));
    const totals = new Map<string, number>();

    for (const leaf of leaves) {
      if (leaf.accountType !== BalanceAccountType.ASSET) {
        continue;
      }
      const root = findRoot(leaf, byId);
      totals.set(root.id, (totals.get(root.id) ?? 0) + valueAt(leaf.id, leaf.code, date));
    }

    const sections = [...totals.entries()]
      .map(([accountId, amount]) => ({
        account: byId.get(accountId) as BalanceAccount,
        amount: round2(amount),
      }))
      .filter(section => section.amount !== 0)
      .sort((a, b) => b.amount - a.amount || a.account.position - b.account.position);

    return sections.map(section => ({
      code: section.account.code,
      name: resolveName(section.account, locale),
      amount: section.amount,
      percent: assetsTotal > 0 ? round2((section.amount / assetsTotal) * 100) : 0,
    }));
  }

  private async resolveCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    const normalized = String(workspace?.currency || '')
      .trim()
      .toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : 'KZT';
  }

  /**
   * Start of the window. For `all` that is the first day the workspace has any
   * data at all, so the chart opens on the real beginning of the history
   * rather than on an arbitrary number of days.
   */
  private async resolveFrom(
    workspaceId: string,
    range: NetWorthRange,
    to: string,
  ): Promise<string> {
    if (range !== 'all') {
      return shiftDays(to, -RANGE_DAYS[range]);
    }

    const [snapshot, transaction] = await Promise.all([
      this.balanceSnapshotRepository
        .createQueryBuilder('snapshot')
        .select('MIN(snapshot.snapshotDate)', 'earliest')
        .where('snapshot.workspaceId = :workspaceId', { workspaceId })
        .getRawOne<{ earliest: string | null }>(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('MIN(transaction.transactionDate)', 'earliest')
        .where('transaction.workspaceId = :workspaceId', { workspaceId })
        .getRawOne<{ earliest: string | null }>(),
    ]);

    const candidates = [snapshot?.earliest, transaction?.earliest]
      .filter((value): value is string => Boolean(value))
      .map(value => isoDate(new Date(value)));

    if (candidates.length === 0) {
      return shiftDays(to, -EMPTY_WORKSPACE_DAYS);
    }

    return candidates.sort()[0];
  }

  private async loadSnapshots(workspaceId: string, to: string): Promise<BalanceSnapshot[]> {
    return this.balanceSnapshotRepository
      .createQueryBuilder('snapshot')
      .select(['snapshot.accountId', 'snapshot.snapshotDate', 'snapshot.amount'])
      .where('snapshot.workspaceId = :workspaceId', { workspaceId })
      .andWhere('snapshot.snapshotDate <= :to', { to })
      .orderBy('snapshot.snapshotDate', 'ASC')
      .addOrderBy('snapshot.updatedAt', 'ASC')
      .getMany();
  }

  /**
   * Cash at each sample date, in one pass instead of one query per point.
   *
   * The historical points follow the same rule as the balance sheet's cash
   * line — wallets when the workspace has any, the latest bank statement
   * otherwise — but they are a second implementation of it, so today's point
   * is overwritten with BalanceService's own answer. That keeps the headline
   * number, the one a user checks against the balance sheet, identical by
   * construction; only the shape of the line behind it is computed here.
   */
  private async loadCashSeries(workspaceId: string, dates: string[]): Promise<Map<string, number>> {
    const series = await this.loadHistoricalCashSeries(workspaceId, dates);

    const to = dates[dates.length - 1];
    series.set(to, await this.balanceService.getCashBalance(workspaceId, to));

    return series;
  }

  private async loadHistoricalCashSeries(
    workspaceId: string,
    dates: string[],
  ): Promise<Map<string, number>> {
    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId },
      select: ['userId'],
    });
    const memberIds = [...new Set(members.map(member => member.userId))];

    const wallets =
      memberIds.length > 0
        ? await this.walletRepository.find({
            where: { userId: In(memberIds), isActive: true },
            select: ['id', 'initialBalance'],
          })
        : [];

    return wallets.length > 0
      ? this.loadWalletCashSeries(workspaceId, wallets, dates)
      : this.loadStatementCashSeries(workspaceId, dates);
  }

  private async loadWalletCashSeries(
    workspaceId: string,
    wallets: Array<Pick<Wallet, 'id' | 'initialBalance'>>,
    dates: string[],
  ): Promise<Map<string, number>> {
    const walletIds = wallets.map(wallet => wallet.id);
    const initialBalance = wallets.reduce(
      (sum, wallet) => sum + toNumber(wallet.initialBalance),
      0,
    );
    const to = dates[dates.length - 1];

    const rows = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.transactionDate', 'date')
      .addSelect('COALESCE(SUM(transaction.credit), 0)', 'credit')
      .addSelect('COALESCE(SUM(transaction.debit), 0)', 'debit')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.walletId IN (:...walletIds)', { walletIds })
      .andWhere('transaction.transactionDate <= :to', { to })
      .groupBy('transaction.transactionDate')
      .orderBy('transaction.transactionDate', 'ASC')
      .getRawMany<{ date: string; credit: string; debit: string }>();

    const deltas = rows.map(row => ({
      date: isoDate(new Date(row.date)),
      delta: toNumber(row.credit) - toNumber(row.debit),
    }));

    const series = new Map<string, number>();
    let running = initialBalance;
    let index = 0;
    for (const date of dates) {
      while (index < deltas.length && deltas[index].date <= date) {
        running += deltas[index].delta;
        index += 1;
      }
      series.set(date, round2(running));
    }

    return series;
  }

  private async loadStatementCashSeries(
    workspaceId: string,
    dates: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.statementRepository
      .createQueryBuilder('statement')
      .select('statement.statementDateTo', 'date')
      .addSelect('statement.balanceEnd', 'balanceEnd')
      .addSelect('statement.createdAt', 'createdAt')
      .where('statement.workspaceId = :workspaceId', { workspaceId })
      .andWhere('statement.balanceEnd IS NOT NULL')
      .andWhere('statement.statementDateTo IS NOT NULL')
      .andWhere('statement.status IN (:...statuses)', {
        statuses: [StatementStatus.PARSED, StatementStatus.VALIDATED, StatementStatus.COMPLETED],
      })
      .orderBy('statement.statementDateTo', 'ASC')
      .addOrderBy('statement.createdAt', 'ASC')
      .getRawMany<{ date: string; balanceEnd: string; createdAt: string }>();

    const balances = rows.map(row => ({
      date: isoDate(new Date(row.date)),
      value: toNumber(row.balanceEnd),
    }));

    const series = new Map<string, number>();
    let latest = 0;
    let index = 0;
    for (const date of dates) {
      while (index < balances.length && balances[index].date <= date) {
        latest = balances[index].value;
        index += 1;
      }
      series.set(date, round2(latest));
    }

    return series;
  }
}

/**
 * Totals per classification bucket, with unlabelled lines kept as their own
 * `null` bucket rather than dropped — how much is still unclassified is worth
 * seeing, not hiding.
 */
function groupBy(
  lines: NetWorthAssetLine[],
  pick: (line: NetWorthAssetLine) => string | null,
  total: number,
): NetWorthClassificationItem[] {
  const totals = new Map<string | null, number>();
  for (const line of lines) {
    const key = pick(line);
    totals.set(key, (totals.get(key) ?? 0) + line.amount);
  }

  return [...totals.entries()]
    .map(([key, amount]) => ({
      key,
      amount: round2(amount),
      percent: total > 0 ? round2((amount / total) * 100) : 0,
    }))
    .filter(item => item.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

function findLeaves(accounts: BalanceAccount[]): BalanceAccount[] {
  const parentIds = new Set(
    accounts.map(account => account.parentId).filter((id): id is string => Boolean(id)),
  );
  return accounts.filter(account => !parentIds.has(account.id));
}

function findRoot(account: BalanceAccount, byId: Map<string, BalanceAccount>): BalanceAccount {
  let current = account;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) {
      break;
    }
    current = parent;
  }
  return current;
}

function groupSnapshots(snapshots: BalanceSnapshot[]): Map<string, BalanceSnapshot[]> {
  const byAccount = new Map<string, BalanceSnapshot[]>();
  for (const snapshot of snapshots) {
    const bucket = byAccount.get(snapshot.accountId);
    if (bucket) {
      bucket.push(snapshot);
    } else {
      byAccount.set(snapshot.accountId, [snapshot]);
    }
  }
  return byAccount;
}

/** Forward fill: an account holds its last entered value until the next one. */
function latestOnOrBefore(snapshots: BalanceSnapshot[] | undefined, date: string): number {
  if (!snapshots) {
    return 0;
  }

  let value = 0;
  for (const snapshot of snapshots) {
    if (isoDate(new Date(snapshot.snapshotDate)) > date) {
      break;
    }
    value = toNumber(snapshot.amount);
  }
  return value;
}

/** `count` evenly spaced dates from `from` to `to`, inclusive of both ends. */
function samplePoints(from: string, to: string, count: number): string[] {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!(end > start)) {
    return [to];
  }

  const step = (end - start) / (count - 1);
  const dates = Array.from({ length: count }, (_, index) =>
    isoDate(new Date(start + step * index)),
  );

  // Even spacing can land twice on the same day on very short histories.
  return [...new Set(dates)];
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function shiftDays(date: string, days: number): string {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return isoDate(shifted);
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveName(account: BalanceAccount, locale?: string): string {
  if (locale === 'en' && account.nameEn) {
    return account.nameEn;
  }
  if (locale === 'kk' && account.nameKk) {
    return account.nameKk;
  }
  return account.name;
}
