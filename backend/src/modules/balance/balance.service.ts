import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { In, type Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import {
  ActorType,
  AuditAction,
  BalanceAccount,
  BalanceAccountType,
  BalanceSnapshot,
  EntityType,
  Statement,
  StatementStatus,
  Transaction,
  Wallet,
  Workspace,
  WorkspaceMember,
} from '../../entities';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_BALANCE_ACCOUNTS } from './balance-default-accounts';
import { BalanceExportFormat, type ExportBalanceDto } from './dto/export-balance.dto';
import type { UpdateAccountClassificationDto } from './dto/update-account-classification.dto';
import type { UpdateBalanceSnapshotDto } from './dto/update-balance-snapshot.dto';

/** The one line whose risk is fixed rather than chosen. */
export const CASH_ACCOUNT_CODE = 'ASSET_CASH';

type BalanceAccountNode = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameKk: string | null;
  accountType: BalanceAccountType;
  isEditable: boolean;
  isAutoComputed: boolean;
  isExpandable: boolean;
  amount: number;
  children: BalanceAccountNode[];
  position: number;
};

type BalanceSheetResponse = {
  date: string;
  currency: string;
  assets: {
    total: number;
    sections: BalanceAccountNode[];
  };
  liabilities: {
    total: number;
    sections: BalanceAccountNode[];
  };
  difference: number;
  isBalanced: boolean;
};

@Injectable()
export class BalanceService {
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
    private readonly auditService: AuditService,
  ) {}

  private normalizeCurrency(currency: string | null | undefined): string {
    const normalized = String(currency || '')
      .trim()
      .toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : 'KZT';
  }

  private async getWorkspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    return this.normalizeCurrency(workspace?.currency);
  }

  private resolveDate(date?: string): string {
    if (!date) {
      return new Date().toISOString().split('T')[0];
    }

    const asDate = new Date(date);
    if (Number.isNaN(asDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return asDate.toISOString().split('T')[0];
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private formatAmount(value: number, currency: string): string {
    return `${this.round(value).toFixed(2)} ${currency}`;
  }

  private resolveAccountName(node: BalanceAccountNode, locale?: string): string {
    if (locale === 'en' && node.nameEn) {
      return node.nameEn;
    }

    if (locale === 'kk' && node.nameKk) {
      return node.nameKk;
    }

    return node.name;
  }

  private localizeTree(nodes: BalanceAccountNode[], locale?: string): void {
    for (const node of nodes) {
      node.name = this.resolveAccountName(node, locale);
      if (node.children.length > 0) {
        this.localizeTree(node.children, locale);
      }
    }
  }

  private getExportLabels(locale?: string): Record<string, string> {
    const resolvedLocale = locale === 'en' || locale === 'kk' ? locale : 'ru';
    const labels = {
      ru: {
        balanceAsOf: 'Баланс на',
        assets: 'Активы',
        liabilities: 'Пассивы',
        total: 'Итого',
        difference: 'Разница',
        balanced: 'Сходится',
        yes: 'Да',
        no: 'Нет',
        notBalanced: 'не сходится',
      },
      en: {
        balanceAsOf: 'Balance sheet as of',
        assets: 'Assets',
        liabilities: 'Liabilities',
        total: 'Total',
        difference: 'Difference',
        balanced: 'Balanced',
        yes: 'Yes',
        no: 'No',
        notBalanced: 'not balanced',
      },
      kk: {
        balanceAsOf: 'Баланс',
        assets: 'Активтер',
        liabilities: 'Пассивтер',
        total: 'Барлығы',
        difference: 'Айырма',
        balanced: 'Сәйкес',
        yes: 'Иә',
        no: 'Жоқ',
        notBalanced: 'сәйкес емес',
      },
    };

    return labels[resolvedLocale];
  }

  private flattenForExport(
    accounts: BalanceAccountNode[],
    level = 0,
  ): Array<{ label: string; amount: number }> {
    const rows: Array<{ label: string; amount: number }> = [];

    for (const account of accounts) {
      rows.push({
        label: `${'  '.repeat(level)}${account.name}`,
        amount: this.round(account.amount),
      });

      if (account.children.length > 0) {
        rows.push(...this.flattenForExport(account.children, level + 1));
      }
    }

    return rows;
  }

  private async ensureSeeded(workspaceId: string): Promise<void> {
    const count = await this.balanceAccountRepository.count({ where: { workspaceId } });
    if (count > 0) {
      return;
    }

    await this.seedDefaultAccounts(workspaceId);
  }

  private async getLatestSnapshotMap(
    workspaceId: string,
    snapshotDate: string,
  ): Promise<Map<string, BalanceSnapshot>> {
    const snapshots = await this.balanceSnapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.workspaceId = :workspaceId', { workspaceId })
      .andWhere('snapshot.snapshotDate <= :snapshotDate', { snapshotDate })
      .orderBy('snapshot.accountId', 'ASC')
      .addOrderBy('snapshot.snapshotDate', 'DESC')
      .addOrderBy('snapshot.updatedAt', 'DESC')
      .getMany();

    const latestByAccount = new Map<string, BalanceSnapshot>();
    for (const snapshot of snapshots) {
      if (!latestByAccount.has(snapshot.accountId)) {
        latestByAccount.set(snapshot.accountId, snapshot);
      }
    }

    return latestByAccount;
  }

  private async getRetainedEarnings(workspaceId: string, date: string): Promise<number> {
    const aggregate = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.credit), 0)', 'totalCredit')
      .addSelect('COALESCE(SUM(transaction.debit), 0)', 'totalDebit')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate <= :date', { date })
      .getRawOne<{ totalCredit: string; totalDebit: string }>();

    const totalCredit = this.toNumber(aggregate?.totalCredit);
    const totalDebit = this.toNumber(aggregate?.totalDebit);

    return this.round(totalCredit - totalDebit);
  }

  private async getAutoComputedCashBalance(workspaceId: string, date: string): Promise<number> {
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

    const walletIds = wallets.map(wallet => wallet.id);
    const initialBalance = wallets.reduce(
      (acc, wallet) => acc + this.toNumber(wallet.initialBalance),
      0,
    );

    let debit = 0;
    let credit = 0;

    if (walletIds.length > 0) {
      const aggregate = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.debit), 0)', 'totalDebit')
        .addSelect('COALESCE(SUM(transaction.credit), 0)', 'totalCredit')
        .where('transaction.workspaceId = :workspaceId', { workspaceId })
        .andWhere('transaction.walletId IN (:...walletIds)', { walletIds })
        .andWhere('transaction.transactionDate <= :date', { date })
        .getRawOne<{ totalDebit: string; totalCredit: string }>();

      debit = this.toNumber(aggregate?.totalDebit);
      credit = this.toNumber(aggregate?.totalCredit);
    }

    const walletBalance = this.round(initialBalance + credit - debit);
    const hasWalletData = walletIds.length > 0 || credit !== 0 || debit !== 0;

    const latestStatement = await this.statementRepository
      .createQueryBuilder('statement')
      .select('statement.balanceEnd', 'balanceEnd')
      .where('statement.workspaceId = :workspaceId', { workspaceId })
      .andWhere('statement.balanceEnd IS NOT NULL')
      .andWhere('(statement.statementDateTo IS NULL OR statement.statementDateTo <= :date)', {
        date,
      })
      .andWhere('statement.status IN (:...statuses)', {
        statuses: [StatementStatus.PARSED, StatementStatus.VALIDATED, StatementStatus.COMPLETED],
      })
      .orderBy('statement.statementDateTo', 'DESC', 'NULLS LAST')
      .addOrderBy('statement.createdAt', 'DESC')
      .limit(1)
      .getRawOne<{ balanceEnd: string | null }>();

    const statementBalance = this.toNumber(latestStatement?.balanceEnd);

    if (hasWalletData) {
      return walletBalance;
    }

    return this.round(statementBalance);
  }

  /**
   * Cash on a given date, by the same rules the balance sheet uses. Exposed so
   * the net worth report agrees with the balance sheet line for line instead
   * of reimplementing the wallet/statement fallback.
   */
  async getCashBalance(workspaceId: string, date?: string): Promise<number> {
    return this.getAutoComputedCashBalance(workspaceId, this.resolveDate(date));
  }

  /**
   * Sets how a balance line behaves and how risky it is. Both are the user's
   * judgement, so this only records what they chose — nothing is inferred
   * from the account's type or sub-type.
   *
   * Cash is refused: it is the zero-risk anchor the allocation rule measures
   * everything else against, and letting it be labelled anything else would
   * make the rule meaningless.
   */
  async updateAccountClassification(
    userId: string,
    workspaceId: string,
    accountId: string,
    dto: UpdateAccountClassificationDto,
  ) {
    const account = await this.balanceAccountRepository.findOne({
      where: { id: accountId, workspaceId },
    });

    if (!account) {
      throw new NotFoundException('Balance account not found');
    }

    if (account.code === CASH_ACCOUNT_CODE) {
      throw new BadRequestException('Cash is always low risk and cannot be classified');
    }

    const before = { capitalRole: account.capitalRole, riskLevel: account.riskLevel };

    if (dto.capitalRole !== undefined) {
      account.capitalRole = dto.capitalRole;
    }
    if (dto.riskLevel !== undefined) {
      account.riskLevel = dto.riskLevel;
    }

    await this.balanceAccountRepository.save(account);

    // Risk classification decides whether the 80/20 warning fires, so a change
    // to it is audited the same way a snapshot edit is.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.UPDATE,
      meta: {
        kind: 'balance_account_classification',
        accountId: account.id,
        accountCode: account.code,
      },
      diff: {
        before,
        after: { capitalRole: account.capitalRole, riskLevel: account.riskLevel },
      },
    });

    return {
      id: account.id,
      code: account.code,
      capitalRole: account.capitalRole,
      riskLevel: account.riskLevel,
    };
  }

  async seedDefaultAccounts(workspaceId: string): Promise<void> {
    const existing = await this.balanceAccountRepository.count({ where: { workspaceId } });
    if (existing > 0) {
      return;
    }

    const parentByCode = new Map<string, BalanceAccount>();

    for (const definition of DEFAULT_BALANCE_ACCOUNTS) {
      const parentId = definition.parentCode
        ? (parentByCode.get(definition.parentCode)?.id ?? null)
        : null;

      const account = this.balanceAccountRepository.create({
        workspaceId,
        parentId,
        code: definition.code,
        name: definition.name,
        nameEn: definition.nameEn,
        nameKk: definition.nameKk,
        accountType: definition.accountType,
        subType: definition.subType,
        isEditable: definition.isEditable ?? true,
        isAutoComputed: definition.isAutoComputed ?? false,
        autoSource: definition.autoSource ?? null,
        position: definition.position,
        isSystem: true,
        isExpandable: definition.isExpandable ?? false,
      });

      const saved = await this.balanceAccountRepository.save(account);
      parentByCode.set(definition.code, saved);
    }
  }

  async getBalanceSheet(
    workspaceId: string,
    date?: string,
    locale?: string,
  ): Promise<BalanceSheetResponse> {
    await this.ensureSeeded(workspaceId);

    const snapshotDate = this.resolveDate(date);

    const [accounts, snapshotsMap, cashBalance, retainedEarnings, currency] = await Promise.all([
      this.balanceAccountRepository.find({
        where: { workspaceId },
        order: {
          position: 'ASC',
          createdAt: 'ASC',
        },
      }),
      this.getLatestSnapshotMap(workspaceId, snapshotDate),
      this.getAutoComputedCashBalance(workspaceId, snapshotDate),
      this.getRetainedEarnings(workspaceId, snapshotDate),
      this.getWorkspaceCurrency(workspaceId),
    ]);

    const autoAmountsByCode = new Map<string, number>([
      ['ASSET_CASH', cashBalance],
      ['EQUITY_RETAINED_EARNINGS', retainedEarnings],
    ]);

    const nodesById = new Map<string, BalanceAccountNode>();
    for (const account of accounts) {
      nodesById.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        nameEn: account.nameEn,
        nameKk: account.nameKk,
        accountType: account.accountType,
        isEditable: account.isEditable,
        isAutoComputed: account.isAutoComputed,
        isExpandable: account.isExpandable,
        amount: 0,
        children: [],
        position: account.position,
      });
    }

    const roots: BalanceAccountNode[] = [];
    for (const account of accounts) {
      const node = nodesById.get(account.id);
      if (!node) {
        continue;
      }

      if (account.parentId && nodesById.has(account.parentId)) {
        nodesById.get(account.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const computeAmount = (node: BalanceAccountNode): number => {
      const childrenTotal =
        node.children.length > 0
          ? node.children
              .sort((a, b) => a.position - b.position)
              .reduce((acc, child) => acc + computeAmount(child), 0)
          : 0;

      let amount = childrenTotal;

      if (node.children.length === 0) {
        if (node.isAutoComputed) {
          amount = autoAmountsByCode.get(node.code) ?? 0;
        } else {
          amount = this.toNumber(snapshotsMap.get(node.id)?.amount);
        }
      }

      node.amount = this.round(amount);
      return node.amount;
    };

    for (const root of roots) {
      computeAmount(root);
    }

    const sortedRoots = roots.sort((a, b) => a.position - b.position);
    const assets = sortedRoots.filter(section => section.accountType === BalanceAccountType.ASSET);
    const liabilities = sortedRoots.filter(
      section =>
        section.accountType === BalanceAccountType.LIABILITY ||
        section.accountType === BalanceAccountType.EQUITY,
    );

    this.localizeTree(assets, locale);
    this.localizeTree(liabilities, locale);

    const assetsTotal = this.round(assets.reduce((acc, section) => acc + section.amount, 0));
    const liabilitiesTotal = this.round(
      liabilities.reduce((acc, section) => acc + section.amount, 0),
    );
    const difference = this.round(assetsTotal - liabilitiesTotal);

    return {
      date: snapshotDate,
      currency,
      assets: {
        total: assetsTotal,
        sections: assets,
      },
      liabilities: {
        total: liabilitiesTotal,
        sections: liabilities,
      },
      difference,
      isBalanced: Math.abs(difference) < 0.01,
    };
  }

  async getAccountsTree(workspaceId: string, date?: string, locale?: string) {
    const sheet = await this.getBalanceSheet(workspaceId, date, locale);

    return {
      assets: sheet.assets.sections,
      liabilities: sheet.liabilities.sections,
      date: sheet.date,
    };
  }

  async updateSnapshot(userId: string, workspaceId: string, dto: UpdateBalanceSnapshotDto) {
    const snapshotDate = this.resolveDate(dto.date);
    const account = await this.balanceAccountRepository.findOne({
      where: {
        id: dto.accountId,
        workspaceId,
      },
    });

    if (!account) {
      throw new NotFoundException('Balance account not found');
    }

    if (!account.isEditable) {
      throw new BadRequestException('This balance line is auto-calculated and cannot be edited');
    }

    const amount = this.round(dto.amount);
    const currency = dto.currency || (await this.getWorkspaceCurrency(workspaceId));

    const existingSnapshot = await this.balanceSnapshotRepository.findOne({
      where: {
        workspaceId,
        accountId: account.id,
        snapshotDate,
      },
    });

    const beforeAmount = existingSnapshot ? this.toNumber(existingSnapshot.amount) : null;

    if (existingSnapshot) {
      existingSnapshot.amount = amount;
      existingSnapshot.currency = currency;
      existingSnapshot.createdBy = userId;
      await this.balanceSnapshotRepository.save(existingSnapshot);
    } else {
      const created = this.balanceSnapshotRepository.create({
        workspaceId,
        accountId: account.id,
        snapshotDate,
        amount,
        currency,
        createdBy: userId,
      });
      await this.balanceSnapshotRepository.save(created);
    }

    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.UPDATE,
      meta: {
        kind: 'balance_snapshot',
        accountId: account.id,
        accountCode: account.code,
        snapshotDate,
      },
      diff: {
        before: beforeAmount === null ? null : { amount: beforeAmount },
        after: { amount },
      },
    });

    return {
      accountId: account.id,
      snapshotDate,
      amount,
      currency,
    };
  }

  private async exportAsExcel(data: BalanceSheetResponse, locale?: string): Promise<Buffer> {
    const labels = this.getExportLabels(locale);
    const leftRows = this.flattenForExport(data.assets.sections);
    const rightRows = this.flattenForExport(data.liabilities.sections);
    const maxRows = Math.max(leftRows.length, rightRows.length);

    const rows: Array<Array<string | number>> = [
      [`${labels.balanceAsOf} ${data.date}`, '', '', ''],
      ['', '', '', ''],
      [
        `${labels.assets} (${this.formatAmount(data.assets.total, data.currency)})`,
        '',
        `${labels.liabilities} (${this.formatAmount(data.liabilities.total, data.currency)})`,
        '',
      ],
      ['', '', '', ''],
    ];

    for (let i = 0; i < maxRows; i++) {
      const left = leftRows[i];
      const right = rightRows[i];
      rows.push([
        left?.label || '',
        left ? this.round(left.amount) : '',
        right?.label || '',
        right ? this.round(right.amount) : '',
      ]);
    }

    rows.push(['', '', '', '']);
    rows.push([
      labels.total,
      this.round(data.assets.total),
      labels.total,
      this.round(data.liabilities.total),
    ]);
    rows.push([
      labels.difference,
      this.round(data.difference),
      labels.balanced,
      data.isBalanced ? labels.yes : labels.no,
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 46 }, { wch: 16 }, { wch: 46 }, { wch: 16 }];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Balance');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async exportAsPdf(data: BalanceSheetResponse, locale?: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const labels = this.getExportLabels(locale);

    const leftRows = this.flattenForExport(data.assets.sections);
    const rightRows = this.flattenForExport(data.liabilities.sections);
    const maxRows = Math.max(leftRows.length, rightRows.length);

    const margin = 40;
    const top = page.getHeight() - margin;
    const mid = page.getWidth() / 2;
    const lineHeight = 16;

    page.drawText(`${labels.balanceAsOf} ${data.date}`, {
      x: margin,
      y: top,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const assetsTotalAmount = this.formatAmount(data.assets.total, data.currency);
    page.drawText(`${labels.assets}: ${assetsTotalAmount}`, {
      x: margin,
      y: top - 32,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const liabilitiesTotalAmount = this.formatAmount(data.liabilities.total, data.currency);
    page.drawText(`${labels.liabilities}: ${liabilitiesTotalAmount}`, {
      x: mid + 10,
      y: top - 32,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    let y = top - 58;
    for (let i = 0; i < maxRows; i++) {
      const left = leftRows[i];
      const right = rightRows[i];

      if (left) {
        page.drawText(left.label, {
          x: margin,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0.15, 0.15, 0.15),
        });
        page.drawText(this.formatAmount(left.amount, data.currency), {
          x: mid - 120,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0.15, 0.15, 0.15),
        });
      }

      if (right) {
        page.drawText(right.label, {
          x: mid + 10,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0.15, 0.15, 0.15),
        });
        page.drawText(this.formatAmount(right.amount, data.currency), {
          x: page.getWidth() - margin - 120,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0.15, 0.15, 0.15),
        });
      }

      y -= lineHeight;
      if (y <= margin + 24) {
        break;
      }
    }

    const differenceAmount = this.formatAmount(data.difference, data.currency);
    const balancedLabel = data.isBalanced ? labels.balanced : labels.notBalanced;
    page.drawText(`${labels.difference}: ${differenceAmount} (${balancedLabel})`, {
      x: margin,
      y: margin,
      size: 11,
      font: boldFont,
      color: data.isBalanced ? rgb(0.12, 0.5, 0.2) : rgb(0.7, 0.2, 0.2),
    });

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  async exportBalanceSheet(
    workspaceId: string,
    dto: ExportBalanceDto,
    locale?: string,
  ): Promise<{
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }> {
    const effectiveLocale = dto.locale || locale;
    const balanceSheet = await this.getBalanceSheet(workspaceId, dto.date, effectiveLocale);
    const dateKey = balanceSheet.date;

    if (dto.format === BalanceExportFormat.PDF) {
      const buffer = await this.exportAsPdf(balanceSheet, effectiveLocale);
      return {
        fileName: `balance-sheet-${dateKey}.pdf`,
        contentType: 'application/pdf',
        buffer,
      };
    }

    const buffer = await this.exportAsExcel(balanceSheet, effectiveLocale);
    return {
      fileName: `balance-sheet-${dateKey}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }
}
