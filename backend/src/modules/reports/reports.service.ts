import * as fs from 'fs';
import * as os from 'node:os';
import * as path from 'path';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Between, In, MoreThanOrEqual, type Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import { normalizeCurrency } from '../../common/constants/currency.constants';
import { formatMoney } from '../../common/utils/format-money.util';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { Branch } from '../../entities/branch.entity';
import { Category } from '../../entities/category.entity';
import {
  CustomTableColumn,
  CustomTableColumnType,
} from '../../entities/custom-table-column.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTable } from '../../entities/custom-table.entity';
import { ReportHistory } from '../../entities/report-history.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { AuditService } from '../audit/audit.service';
import { type CustomReportDto, ReportGroupBy } from './dto/custom-report.dto';
import {
  CustomTableReportFlowType,
  CustomTableReportSortKey,
  type CustomTablesReportDrillDownDto,
  type CustomTablesReportDto,
} from './dto/custom-tables-report.dto';
import type { CustomTablesSummaryDto } from './dto/custom-tables-summary.dto';
import { ExportFormat, type ExportReportDto } from './dto/export-report.dto';
import type { GenerateReportDto } from './dto/generate-report.dto';
import type { SpendOverTimeQueryDto } from './dto/spend-over-time-query.dto';
import type { TopCategoriesQueryDto } from './dto/top-categories-query.dto';
import { WorkspaceExportFormat } from './dto/workspace-export.dto';
import type { CustomReport, CustomReportGroup } from './interfaces/custom-report.interface';
import type { DailyReport } from './interfaces/daily-report.interface';
import type { MonthlyReport } from './interfaces/monthly-report.interface';
import type { TopCategoriesReport } from './interfaces/top-categories-report.interface';

export interface StatementsSummaryResponse {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
}

export interface CustomTablesSummaryResponse {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    tableId: string;
    tableName: string;
    rowNumber: number;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
  tables: Array<{
    id: string;
    name: string;
    income: number;
    expense: number;
    net: number;
    rows: number;
  }>;
}

interface WorkspaceTransactionExportRow {
  index: number;
  transactionDate: string;
  transactionType: string;
  counterpartyName: string;
  counterpartyBin: string;
  paymentPurpose: string;
  debit: number | null;
  credit: number | null;
  amount: number | null;
  currency: string;
  category: string;
  branch: string;
  wallet: string;
  documentNumber: string;
  comments: string;
}

interface CustomReportExportRow {
  Группа: string;
  Дата: string | null;
  Контрагент: string;
  Сумма: number;
  Категория: string;
  Филиал: string;
  Кошелёк: string;
}

interface PdfMakeLike {
  vfs?: unknown;
  createPdf(docDefinition: unknown): { getBuffer(callback: (buffer: Uint8Array) => void): void };
}

interface PdfFontsLike {
  pdfMake?: { vfs?: unknown };
  vfs?: unknown;
}

export interface CustomTablesReportRow {
  counterparty: string;
  source: 'manual' | 'google_sheets_import';
  tableId: string;
  tableName: string;
  count: number;
  total: number;
  average: number;
  lastDate: string | null;
  currency: string | null;
}

export interface CustomTablesReportResponse {
  totals: {
    total: number;
    manualTotal: number;
    googleSheetsTotal: number;
    operations: number;
  };
  comparison: {
    totalDelta: number;
    totalPercentage: number;
    totalTrend: 'up' | 'down' | 'flat';
    manualDelta: number;
    manualPercentage: number;
    manualTrend: 'up' | 'down' | 'flat';
    googleSheetsDelta: number;
    googleSheetsPercentage: number;
    googleSheetsTrend: 'up' | 'down' | 'flat';
    operationsDelta: number;
    operationsPercentage: number;
    operationsTrend: 'up' | 'down' | 'flat';
  };
  timeseries: Array<{ date: string; amount: number }>;
  sourceSplit: { manual: number; googleSheets: number };
  aggregatedRows: CustomTablesReportRow[];
  tables: Array<{
    id: string;
    name: string;
    source: 'manual' | 'google_sheets_import';
    total: number;
    rows: number;
  }>;
}

export interface CustomTablesReportDrillDownResponse {
  counterparty: string;
  items: Array<{
    rowId: string;
    tableId: string;
    tableName: string;
    source: 'manual' | 'google_sheets_import';
    date: string | null;
    amount: number;
    category: string | null;
    currency: string | null;
  }>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  private toParsableDateInput(value: unknown): string | number | Date | null {
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
      return value;
    }

    return null;
  }

  private toPdfMakeModule(module: unknown): PdfMakeLike {
    const candidate =
      typeof module === 'object' && module !== null && 'default' in module
        ? (module as { default: unknown }).default
        : module;
    return candidate as PdfMakeLike;
  }

  private toPdfFontsModule(module: unknown): PdfFontsLike {
    const candidate =
      typeof module === 'object' && module !== null && 'default' in module
        ? (module as { default: unknown }).default
        : module;
    return candidate as PdfFontsLike;
  }

  private emptyCustomTablesReportResponse(): CustomTablesReportResponse {
    return {
      totals: { total: 0, manualTotal: 0, googleSheetsTotal: 0, operations: 0 },
      comparison: {
        totalDelta: 0,
        totalPercentage: 0,
        totalTrend: 'flat',
        manualDelta: 0,
        manualPercentage: 0,
        manualTrend: 'flat',
        googleSheetsDelta: 0,
        googleSheetsPercentage: 0,
        googleSheetsTrend: 'flat',
        operationsDelta: 0,
        operationsPercentage: 0,
        operationsTrend: 'flat',
      },
      timeseries: [],
      sourceSplit: { manual: 0, googleSheets: 0 },
      aggregatedRows: [],
      tables: [],
    };
  }

  private toStartOfUtcDay(date: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }

  private toEndOfUtcDay(date: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(23, 59, 59, 999);
    return copy;
  }

  private formatMonthPeriod(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private formatMonthLabel(date: Date): string {
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}.${year}`;
  }

  private getIsoWeekInfo(date: Date): { year: number; week: number } {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: target.getUTCFullYear(), week };
  }

  private normalizeText(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const text = String(value).trim();
    return text.length ? text : null;
  }

  private parseNumber(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const raw = String(value).trim();
    if (!raw.length) {
      return null;
    }

    const normalized = raw
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, '')
      .replace(/,/g, '.');

    if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }
    const asNumber = Number(normalized);
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  private parseDate(value: unknown): Date | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw.length) {
        return null;
      }
      const v = raw.split('T')[0];

      const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymd) {
        const year = Number(ymd[1]);
        const month = Number(ymd[2]);
        const day = Number(ymd[3]);
        return new Date(Date.UTC(year, month - 1, day));
      }

      const dmyDot = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dmyDot) {
        const day = Number(dmyDot[1]);
        const month = Number(dmyDot[2]);
        const year = Number(dmyDot[3]);
        return new Date(Date.UTC(year, month - 1, day));
      }

      const dmySlash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmySlash) {
        const day = Number(dmySlash[1]);
        const month = Number(dmySlash[2]);
        const year = Number(dmySlash[3]);
        return new Date(Date.UTC(year, month - 1, day));
      }

      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    try {
      const dateInput = this.toParsableDateInput(value);
      if (dateInput === null) {
        return null;
      }

      const parsed = new Date(dateInput);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  private toDateKey(value: unknown): string {
    if (typeof value === 'string') {
      // Postgres DATE columns often come back as 'YYYY-MM-DD'
      return value.split('T')[0];
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    try {
      const dateInput = this.toParsableDateInput(value);
      if (dateInput === null) {
        return new Date().toISOString().split('T')[0];
      }

      const asDate = new Date(dateInput);
      if (!Number.isNaN(asDate.getTime())) {
        return asDate.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
    return new Date().toISOString().split('T')[0];
  }

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(CustomTable)
    private customTableRepository: Repository<CustomTable>,
    @InjectRepository(CustomTableColumn)
    private customTableColumnRepository: Repository<CustomTableColumn>,
    @InjectRepository(CustomTableRow)
    private customTableRowRepository: Repository<CustomTableRow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly auditService: AuditService,
    @InjectRepository(ReportHistory)
    private readonly reportHistoryRepo: Repository<ReportHistory>,
  ) {}

  private async getReportsVersion(userId: string): Promise<string> {
    const key = `reports:version:${userId}`;
    let version = await this.cacheManager.get<string>(key);
    if (!version) {
      version = Date.now().toString();
      await this.cacheManager.set(key, version, 0); // No expiry (until invalidated)
    }
    return version;
  }

  private scoreDateColumn(col: CustomTableColumn): number {
    const title = (col.title || '').toLowerCase();
    let score = 0;
    if (col.type === CustomTableColumnType.DATE) {
      score += 6;
    }
    if (/(^|[\s_])date([\s_]|$)/.test(title) || title.includes('дата')) {
      score += 4;
    }
    if (title.includes('год') || title.includes('year')) {
      score += 1;
    }
    if (title.includes('месяц') || title.includes('month')) {
      score += 1;
    }
    return score;
  }

  private scoreAmountColumn(col: CustomTableColumn): number {
    const title = (col.title || '').toLowerCase();
    let score = 0;
    if (col.type === CustomTableColumnType.NUMBER) {
      score += 6;
    }
    if (
      title.includes('сумм') ||
      title.includes('amount') ||
      title.includes('итог') ||
      title.includes('total')
    ) {
      score += 4;
    }
    if (title.includes('приход') || title.includes('доход')) {
      score += 2;
    }
    if (title.includes('расход')) {
      score += 2;
    }
    if (title.includes('год') || title.includes('year')) {
      score -= 4;
    }
    if (title.includes('мсц') || title.includes('месяц') || title.includes('month')) {
      score -= 3;
    }
    if (title.includes('курс') || title.includes('rate') || title.includes('обмен')) {
      score -= 4;
    }
    if (title.includes('валют') || title.includes('currency')) {
      score -= 3;
    }
    return score;
  }

  private scoreCategoryColumn(col: CustomTableColumn): number {
    const title = (col.title || '').toLowerCase();
    let score = 0;
    if (title.includes('катег') || title.includes('category')) {
      score += 6;
    }
    if (title.includes('статья') || title.includes('article')) {
      score += 5;
    }
    if (title.includes('группа') || title.includes('group')) {
      score += 2;
    }
    return score;
  }

  private scoreCounterpartyColumn(col: CustomTableColumn): number {
    const title = (col.title || '').toLowerCase();
    let score = 0;
    if (title.includes('контраг') || title.includes('counterparty')) {
      score += 6;
    }
    if (title.includes('постав') || title.includes('supplier')) {
      score += 4;
    }
    if (title.includes('клиент') || title.includes('customer')) {
      score += 4;
    }
    if (title.includes('merchant') || title.includes('получател') || title.includes('платель')) {
      score += 4;
    }
    if (title.includes('кошел') || title.includes('wallet')) {
      score -= 2;
    }
    if (title.includes('филиал') || title.includes('branch')) {
      score -= 2;
    }
    return score;
  }

  private pickBestColumnKey(
    columns: CustomTableColumn[],
    scorer: (col: CustomTableColumn) => number,
  ): string | null {
    let best: CustomTableColumn | null = null;
    let bestScore = 0;
    for (const col of columns) {
      const score = scorer(col);
      if (score > bestScore) {
        bestScore = score;
        best = col;
      }
    }
    return best ? best.key : null;
  }

  async getCustomTablesSummary(
    workspaceId: string,
    dto: CustomTablesSummaryDto,
  ): Promise<CustomTablesSummaryResponse> {
    const version = await this.getReportsVersion(workspaceId);
    const cacheKey = `reports:custom-tables:${workspaceId}:${version}:${JSON.stringify(dto)}`;
    const cached = await this.cacheManager.get<CustomTablesSummaryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const safeDays =
      Number.isFinite(dto.days) && (dto.days as number) > 0
        ? Math.min(dto.days as number, 3650)
        : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeDays);
    since.setHours(0, 0, 0, 0);

    const requestedIds = (dto.tableIds || []).filter(id => typeof id === 'string' && id.length);

    const tables = await this.customTableRepository.find({
      where: {
        workspaceId,
        ...(requestedIds.length ? { id: In(requestedIds) } : {}),
      },
      relations: { category: true },
      order: { updatedAt: 'DESC' },
    });

    if (requestedIds.length && tables.length !== requestedIds.length) {
      throw new BadRequestException('Одна или несколько таблиц не найдены');
    }

    if (!tables.length) {
      return {
        totals: { income: 0, expense: 0, net: 0, rows: 0 },
        timeseries: [],
        categories: [],
        counterparties: [],
        recent: [],
        tables: [],
      };
    }

    const tableById = new Map<string, CustomTable>();
    tables.forEach(t => tableById.set(t.id, t));
    const tableIds = tables.map(t => t.id);

    const columns = await this.customTableColumnRepository.find({
      where: { tableId: In(tableIds) },
      order: { tableId: 'ASC', position: 'ASC' },
    });

    const columnsByTableId = new Map<string, CustomTableColumn[]>();
    for (const col of columns) {
      const list = columnsByTableId.get(col.tableId) || [];
      list.push(col);
      columnsByTableId.set(col.tableId, list);
    }

    const mappingByTableId = new Map<
      string,
      {
        dateKey: string | null;
        amountKey: string | null;
        categoryKey: string | null;
        counterpartyKey: string | null;
      }
    >();

    for (const tableId of tableIds) {
      const cols = columnsByTableId.get(tableId) || [];
      mappingByTableId.set(tableId, {
        dateKey: this.pickBestColumnKey(cols, c => this.scoreDateColumn(c)),
        amountKey: this.pickBestColumnKey(cols, c => this.scoreAmountColumn(c)),
        categoryKey: this.pickBestColumnKey(cols, c => this.scoreCategoryColumn(c)),
        counterpartyKey: this.pickBestColumnKey(cols, c => this.scoreCounterpartyColumn(c)),
      });
    }

    const rows = await this.customTableRowRepository.find({
      where: { tableId: In(tableIds), updatedAt: MoreThanOrEqual(since) },
      order: { updatedAt: 'DESC' },
    });

    const totals = { income: 0, expense: 0, net: 0, rows: 0 };
    const timeseriesMap = new Map<string, { income: number; expense: number }>();
    const categoryMap = new Map<string, { amount: number; rows: number }>();
    const counterpartyMap = new Map<string, { amount: number; rows: number }>();
    const perTableMap = new Map<string, { income: number; expense: number; rows: number }>();
    const recent: CustomTablesSummaryResponse['recent'] = [];

    for (const row of rows) {
      const table = tableById.get(row.tableId);
      if (!table) {
        continue;
      }
      const mapping = mappingByTableId.get(row.tableId);
      const dateValue = mapping?.dateKey ? row.data?.[mapping.dateKey] : null;
      const parsedDate = this.parseDate(dateValue) || row.updatedAt || row.createdAt;
      if (parsedDate < since) {
        continue;
      }

      const amountValue = mapping?.amountKey ? row.data?.[mapping.amountKey] : null;
      const amountRaw = this.parseNumber(amountValue);
      if (amountRaw === null) {
        continue;
      }

      const abs = Math.abs(amountRaw);
      const isIncome = amountRaw >= 0;
      const dateKey = this.toDateKey(parsedDate);
      const ts = timeseriesMap.get(dateKey) || { income: 0, expense: 0 };
      if (isIncome) {
        ts.income += abs;
        totals.income += abs;
      } else {
        ts.expense += abs;
        totals.expense += abs;
      }
      timeseriesMap.set(dateKey, ts);
      totals.rows += 1;

      const perTable = perTableMap.get(row.tableId) || { income: 0, expense: 0, rows: 0 };
      if (isIncome) {
        perTable.income += abs;
      } else {
        perTable.expense += abs;
      }
      perTable.rows += 1;
      perTableMap.set(row.tableId, perTable);

      const categoryValue = mapping?.categoryKey ? row.data?.[mapping.categoryKey] : null;
      const counterpartyValue = mapping?.counterpartyKey
        ? row.data?.[mapping.counterpartyKey]
        : null;
      const categoryName = this.normalizeText(categoryValue) || table.category?.name || null;
      const counterpartyName = this.normalizeText(counterpartyValue) || null;

      if (isIncome) {
        const key = (counterpartyName || 'Без названия').trim() || 'Без названия';
        const existing = counterpartyMap.get(key) || { amount: 0, rows: 0 };
        counterpartyMap.set(key, { amount: existing.amount + abs, rows: existing.rows + 1 });
      } else {
        const key = (categoryName || 'Без категории').trim() || 'Без категории';
        const existing = categoryMap.get(key) || { amount: 0, rows: 0 };
        categoryMap.set(key, { amount: existing.amount + abs, rows: existing.rows + 1 });
      }

      if (recent.length < 20) {
        recent.push({
          id: row.id,
          tableId: table.id,
          tableName: table.name,
          rowNumber: row.rowNumber,
          amount: isIncome ? abs : -abs,
          category: categoryName,
          counterparty: counterpartyName,
          updatedAt: (row.updatedAt || row.createdAt).toISOString(),
        });
      }
    }

    totals.net = totals.income - totals.expense;

    const timeseries = Array.from(timeseriesMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const counterparties = Array.from(counterpartyMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const tablesBreakdown = tables
      .map(t => {
        const metrics = perTableMap.get(t.id) || { income: 0, expense: 0, rows: 0 };
        return {
          id: t.id,
          name: t.name,
          income: metrics.income,
          expense: metrics.expense,
          net: metrics.income - metrics.expense,
          rows: metrics.rows,
        };
      })
      .sort((a, b) => b.rows - a.rows);

    const response: CustomTablesSummaryResponse = {
      totals,
      timeseries,
      categories,
      counterparties,
      recent,
      tables: tablesBreakdown,
    };

    await this.cacheManager.set(cacheKey, response, 300000); // 5 minutes
    return response;
  }

  async getCustomTablesReport(
    workspaceId: string,
    dto: CustomTablesReportDto,
  ): Promise<CustomTablesReportResponse> {
    const version = await this.getReportsVersion(workspaceId);
    const cacheKey = `reports:custom-tables-report:${workspaceId}:${version}:${JSON.stringify(dto)}`;
    const cached = await this.cacheManager.get<CustomTablesReportResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const safeDays =
      Number.isFinite(dto.days) && (dto.days as number) > 0
        ? Math.min(dto.days as number, 3650)
        : 30;
    const flowType = dto.flowType || CustomTableReportFlowType.ALL;
    const sortBy = dto.sortBy || CustomTableReportSortKey.AMOUNT;
    const limit =
      Number.isFinite(dto.limit) && (dto.limit as number) > 0
        ? Math.min(dto.limit as number, 500)
        : 60;
    const search = this.normalizeText(dto.search)?.toLowerCase() || null;

    const since = new Date();
    since.setDate(since.getDate() - safeDays);
    since.setHours(0, 0, 0, 0);

    const previousSince = new Date(since);
    previousSince.setDate(previousSince.getDate() - safeDays);

    const requestedIds = (dto.tableIds || []).filter(id => typeof id === 'string' && id.length);
    const tables = await this.customTableRepository.find({
      where: {
        workspaceId,
        ...(requestedIds.length ? { id: In(requestedIds) } : {}),
      },
      relations: { category: true },
      order: { updatedAt: 'DESC' },
    });

    if (requestedIds.length && tables.length !== requestedIds.length) {
      throw new BadRequestException('Одна или несколько таблиц не найдены');
    }

    if (!tables.length) {
      return this.emptyCustomTablesReportResponse();
    }

    const tableById = new Map<string, CustomTable>();
    tables.forEach(table => tableById.set(table.id, table));
    const tableIds = tables.map(table => table.id);

    const columns = await this.customTableColumnRepository.find({
      where: { tableId: In(tableIds) },
      order: { tableId: 'ASC', position: 'ASC' },
    });

    const columnsByTableId = new Map<string, CustomTableColumn[]>();
    for (const col of columns) {
      const list = columnsByTableId.get(col.tableId) || [];
      list.push(col);
      columnsByTableId.set(col.tableId, list);
    }

    const mappingByTableId = new Map<
      string,
      {
        dateKey: string | null;
        amountKey: string | null;
        categoryKey: string | null;
        counterpartyKey: string | null;
      }
    >();

    for (const tableId of tableIds) {
      const cols = columnsByTableId.get(tableId) || [];
      mappingByTableId.set(tableId, {
        dateKey: this.pickBestColumnKey(cols, c => this.scoreDateColumn(c)),
        amountKey: this.pickBestColumnKey(cols, c => this.scoreAmountColumn(c)),
        categoryKey: this.pickBestColumnKey(cols, c => this.scoreCategoryColumn(c)),
        counterpartyKey: this.pickBestColumnKey(cols, c => this.scoreCounterpartyColumn(c)),
      });
    }

    const currentRows = await this.customTableRowRepository
      .createQueryBuilder('row')
      .where('row.tableId IN (:...tableIds)', { tableIds })
      .andWhere('row.updatedAt >= :since', { since })
      .getMany();

    const previousRows = await this.customTableRowRepository
      .createQueryBuilder('row')
      .where('row.tableId IN (:...tableIds)', { tableIds })
      .andWhere('row.updatedAt >= :previousSince', { previousSince })
      .andWhere('row.updatedAt < :since', { since })
      .getMany();

    type ReportRecord = {
      rowId: string;
      tableId: string;
      tableName: string;
      source: 'manual' | 'google_sheets_import';
      counterparty: string;
      amount: number;
      date: string | null;
      category: string | null;
      currency: string | null;
      flow: 'expense' | 'income';
    };

    const resolveCurrency = (tableId: string, row: CustomTableRow): string | null => {
      const cols = columnsByTableId.get(tableId) || [];
      for (const col of cols) {
        const title = (col.title || '').toLowerCase();
        if (title.includes('валют') || title.includes('currency')) {
          return this.normalizeText(row.data?.[col.key]);
        }
      }
      return null;
    };

    const toRecord = (row: CustomTableRow): ReportRecord | null => {
      const table = tableById.get(row.tableId);
      const mapping = mappingByTableId.get(row.tableId);
      if (!(table && mapping?.amountKey)) {
        return null;
      }

      const rawAmount = this.parseNumber(row.data?.[mapping.amountKey]);
      if (rawAmount === null) {
        return null;
      }

      const flow: 'expense' | 'income' = rawAmount < 0 ? 'expense' : 'income';
      if (flowType === CustomTableReportFlowType.EXPENSE && flow !== 'expense') {
        return null;
      }
      if (flowType === CustomTableReportFlowType.INCOME && flow !== 'income') {
        return null;
      }

      const counterparty =
        this.normalizeText(mapping.counterpartyKey ? row.data?.[mapping.counterpartyKey] : null) ||
        'Unknown';
      const category = this.normalizeText(
        mapping.categoryKey ? row.data?.[mapping.categoryKey] : null,
      );
      const parsedDate = mapping.dateKey
        ? this.parseDate(row.data?.[mapping.dateKey]) || row.updatedAt || row.createdAt
        : row.updatedAt || row.createdAt;
      const date = parsedDate ? this.toDateKey(parsedDate) : null;
      const currency = resolveCurrency(row.tableId, row);

      if (
        search &&
        !counterparty.toLowerCase().includes(search) &&
        !(category || '').toLowerCase().includes(search) &&
        !table.name.toLowerCase().includes(search)
      ) {
        return null;
      }

      return {
        rowId: row.id,
        tableId: row.tableId,
        tableName: table.name,
        source: table.source,
        counterparty,
        amount: Math.abs(rawAmount),
        date,
        category,
        currency,
        flow,
      };
    };

    const records = currentRows.map(toRecord).filter(Boolean) as ReportRecord[];
    const previousRecords = previousRows.map(toRecord).filter(Boolean) as ReportRecord[];

    const totals = { total: 0, manualTotal: 0, googleSheetsTotal: 0, operations: 0 };
    const previousTotals = { total: 0, manualTotal: 0, googleSheetsTotal: 0, operations: 0 };
    const timeseriesMap = new Map<string, number>();
    const aggregateMap = new Map<
      string,
      {
        counterparty: string;
        source: 'manual' | 'google_sheets_import';
        tableId: string;
        tableName: string;
        count: number;
        total: number;
        lastDate: string | null;
        currency: string | null;
      }
    >();
    const tableTotalsMap = new Map<string, { total: number; rows: number }>();

    for (const record of records) {
      totals.total += record.amount;
      totals.operations += 1;
      if (record.source === 'google_sheets_import') {
        totals.googleSheetsTotal += record.amount;
      } else {
        totals.manualTotal += record.amount;
      }

      if (record.date) {
        timeseriesMap.set(record.date, (timeseriesMap.get(record.date) || 0) + record.amount);
      }

      const aggregateKey = `${record.source}:${record.currency || ''}:${record.counterparty.toLowerCase()}`;
      const current = aggregateMap.get(aggregateKey);
      if (current) {
        current.count += 1;
        current.total += record.amount;
        if (record.date && (!current.lastDate || record.date > current.lastDate)) {
          current.lastDate = record.date;
        }
      } else {
        aggregateMap.set(aggregateKey, {
          counterparty: record.counterparty,
          source: record.source,
          tableId: record.tableId,
          tableName: record.tableName,
          count: 1,
          total: record.amount,
          lastDate: record.date,
          currency: record.currency,
        });
      }

      const tableMetrics = tableTotalsMap.get(record.tableId) || { total: 0, rows: 0 };
      tableMetrics.total += record.amount;
      tableMetrics.rows += 1;
      tableTotalsMap.set(record.tableId, tableMetrics);
    }

    for (const record of previousRecords) {
      previousTotals.total += record.amount;
      previousTotals.operations += 1;
      if (record.source === 'google_sheets_import') {
        previousTotals.googleSheetsTotal += record.amount;
      } else {
        previousTotals.manualTotal += record.amount;
      }
    }

    const toComparison = (current: number, previous: number) => {
      const delta = current - previous;
      const percentage =
        previous === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / previous) * 100);
      const trend: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
      return { delta, percentage, trend };
    };

    const totalCmp = toComparison(totals.total, previousTotals.total);
    const manualCmp = toComparison(totals.manualTotal, previousTotals.manualTotal);
    const googleCmp = toComparison(totals.googleSheetsTotal, previousTotals.googleSheetsTotal);
    const operationsCmp = toComparison(totals.operations, previousTotals.operations);

    let aggregatedRows: CustomTablesReportRow[] = Array.from(aggregateMap.values()).map(item => ({
      counterparty: item.counterparty,
      source: item.source,
      tableId: item.tableId,
      tableName: item.tableName,
      count: item.count,
      total: item.total,
      average: item.count > 0 ? item.total / item.count : 0,
      lastDate: item.lastDate,
      currency: item.currency,
    }));

    if (sortBy === CustomTableReportSortKey.AVERAGE) {
      aggregatedRows.sort((a, b) => b.average - a.average);
    } else if (sortBy === CustomTableReportSortKey.OPERATIONS) {
      aggregatedRows.sort((a, b) => b.count - a.count);
    } else {
      aggregatedRows.sort((a, b) => b.total - a.total);
    }
    aggregatedRows = aggregatedRows.slice(0, limit);

    const timeseries = Array.from(timeseriesMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response: CustomTablesReportResponse = {
      totals,
      comparison: {
        totalDelta: totalCmp.delta,
        totalPercentage: totalCmp.percentage,
        totalTrend: totalCmp.trend,
        manualDelta: manualCmp.delta,
        manualPercentage: manualCmp.percentage,
        manualTrend: manualCmp.trend,
        googleSheetsDelta: googleCmp.delta,
        googleSheetsPercentage: googleCmp.percentage,
        googleSheetsTrend: googleCmp.trend,
        operationsDelta: operationsCmp.delta,
        operationsPercentage: operationsCmp.percentage,
        operationsTrend: operationsCmp.trend,
      },
      timeseries,
      sourceSplit: {
        manual: totals.manualTotal,
        googleSheets: totals.googleSheetsTotal,
      },
      aggregatedRows,
      tables: tables
        .map(table => {
          const metrics = tableTotalsMap.get(table.id) || { total: 0, rows: 0 };
          return {
            id: table.id,
            name: table.name,
            source: table.source,
            total: metrics.total,
            rows: metrics.rows,
          };
        })
        .filter(table => table.rows > 0)
        .sort((a, b) => b.total - a.total),
    };

    await this.cacheManager.set(cacheKey, response, 300000);
    return response;
  }

  async getCustomTablesReportDrillDown(
    workspaceId: string,
    dto: CustomTablesReportDrillDownDto,
  ): Promise<CustomTablesReportDrillDownResponse> {
    const safeDays =
      Number.isFinite(dto.days) && (dto.days as number) > 0
        ? Math.min(dto.days as number, 3650)
        : 30;
    const flowType = dto.flowType || CustomTableReportFlowType.ALL;
    const limit =
      Number.isFinite(dto.limit) && (dto.limit as number) > 0
        ? Math.min(dto.limit as number, 200)
        : 120;

    const since = new Date();
    since.setDate(since.getDate() - safeDays);
    since.setHours(0, 0, 0, 0);

    const requestedIds = (dto.tableIds || []).filter(id => typeof id === 'string' && id.length);
    const tables = await this.customTableRepository.find({
      where: {
        workspaceId,
        ...(requestedIds.length ? { id: In(requestedIds) } : {}),
      },
      order: { updatedAt: 'DESC' },
    });

    if (!tables.length) {
      return { counterparty: dto.counterparty, items: [] };
    }

    const tableIds = tables.map(table => table.id);
    const tableById = new Map(tables.map(table => [table.id, table]));
    const columns = await this.customTableColumnRepository.find({
      where: { tableId: In(tableIds) },
      order: { tableId: 'ASC', position: 'ASC' },
    });

    const columnsByTableId = new Map<string, CustomTableColumn[]>();
    for (const col of columns) {
      const list = columnsByTableId.get(col.tableId) || [];
      list.push(col);
      columnsByTableId.set(col.tableId, list);
    }

    const mappingByTableId = new Map<
      string,
      {
        dateKey: string | null;
        amountKey: string | null;
        categoryKey: string | null;
        counterpartyKey: string | null;
      }
    >();

    for (const tableId of tableIds) {
      const cols = columnsByTableId.get(tableId) || [];
      mappingByTableId.set(tableId, {
        dateKey: this.pickBestColumnKey(cols, c => this.scoreDateColumn(c)),
        amountKey: this.pickBestColumnKey(cols, c => this.scoreAmountColumn(c)),
        categoryKey: this.pickBestColumnKey(cols, c => this.scoreCategoryColumn(c)),
        counterpartyKey: this.pickBestColumnKey(cols, c => this.scoreCounterpartyColumn(c)),
      });
    }

    const rows = await this.customTableRowRepository
      .createQueryBuilder('row')
      .where('row.tableId IN (:...tableIds)', { tableIds })
      .andWhere('row.updatedAt >= :since', { since })
      .getMany();

    const items: CustomTablesReportDrillDownResponse['items'] = [];
    const needle = dto.counterparty.trim().toLowerCase();

    for (const row of rows) {
      const table = tableById.get(row.tableId);
      const mapping = mappingByTableId.get(row.tableId);
      if (!(table && mapping?.amountKey)) {
        continue;
      }

      const rawAmount = this.parseNumber(row.data?.[mapping.amountKey]);
      if (rawAmount === null) {
        continue;
      }

      const flow: 'expense' | 'income' = rawAmount < 0 ? 'expense' : 'income';
      if (flowType === CustomTableReportFlowType.EXPENSE && flow !== 'expense') {
        continue;
      }
      if (flowType === CustomTableReportFlowType.INCOME && flow !== 'income') {
        continue;
      }

      const counterparty =
        this.normalizeText(mapping.counterpartyKey ? row.data?.[mapping.counterpartyKey] : null) ||
        'Unknown';
      if (counterparty.toLowerCase() !== needle) {
        continue;
      }

      const category = this.normalizeText(
        mapping.categoryKey ? row.data?.[mapping.categoryKey] : null,
      );
      const parsedDate = mapping.dateKey
        ? this.parseDate(row.data?.[mapping.dateKey]) || row.updatedAt || row.createdAt
        : row.updatedAt || row.createdAt;

      let currency: string | null = null;
      const cols = columnsByTableId.get(row.tableId) || [];
      for (const col of cols) {
        const title = (col.title || '').toLowerCase();
        if (title.includes('валют') || title.includes('currency')) {
          currency = this.normalizeText(row.data?.[col.key]);
          break;
        }
      }

      items.push({
        rowId: row.id,
        tableId: row.tableId,
        tableName: table.name,
        source: table.source,
        date: parsedDate ? this.toDateKey(parsedDate) : null,
        amount: Math.abs(rawAmount),
        category,
        currency,
      });
    }

    items.sort((a, b) => {
      const left = a.date || '';
      const right = b.date || '';
      return right.localeCompare(left);
    });

    return {
      counterparty: dto.counterparty,
      items: items.slice(0, limit),
    };
  }

  async getAvailableCustomTables(workspaceId: string): Promise<
    Array<{
      id: string;
      name: string;
      source: 'manual' | 'google_sheets_import';
      rowCount: number;
    }>
  > {
    const tables = await this.customTableRepository.find({
      where: { workspaceId },
      order: { updatedAt: 'DESC' },
    });

    const results = [] as Array<{
      id: string;
      name: string;
      source: 'manual' | 'google_sheets_import';
      rowCount: number;
    }>;

    for (const table of tables) {
      const rowCount = await this.customTableRowRepository.count({ where: { tableId: table.id } });
      results.push({
        id: table.id,
        name: table.name,
        source: table.source,
        rowCount,
      });
    }

    return results;
  }

  /**
   */
  async generateDailyReport(workspaceId: string, date: string): Promise<DailyReport> {
    const version = await this.getReportsVersion(workspaceId);
    const cacheKey = `reports:daily:${workspaceId}:${version}:${date || 'latest'}`;
    const cached = await this.cacheManager.get<DailyReport>(cacheKey);
    if (cached) {
      return cached;
    }

    const resolvedDate = date || (await this.getLatestTransactionDate(workspaceId));
    const reportDate = resolvedDate ? new Date(resolvedDate) : new Date();
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get income transactions
    const incomeTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionType = :type', { type: TransactionType.INCOME })
      .andWhere('transaction.transactionDate >= :start', { start: startOfDay })
      .andWhere('transaction.transactionDate <= :end', { end: endOfDay })
      .getMany();

    // Get expense transactions
    const expenseTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionType = :type', { type: TransactionType.EXPENSE })
      .andWhere('transaction.transactionDate >= :start', { start: startOfDay })
      .andWhere('transaction.transactionDate <= :end', { end: endOfDay })
      .getMany();

    // Calculate income block
    const incomeTotal = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const counterpartyMap = new Map<string, { amount: number; count: number }>();
    incomeTransactions.forEach(t => {
      const existing = counterpartyMap.get(t.counterpartyName) || { amount: 0, count: 0 };
      counterpartyMap.set(t.counterpartyName, {
        amount: existing.amount + (t.amount || 0),
        count: existing.count + 1,
      });
    });

    const topCounterparties = Array.from(counterpartyMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Calculate expense block
    const expenseTotal = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
    expenseTransactions.forEach(t => {
      const categoryId = t.categoryId || 'uncategorized';
      const categoryName = t.category?.name || 'Без категории';
      const existing = categoryMap.get(categoryId) || { name: categoryName, amount: 0, count: 0 };
      categoryMap.set(categoryId, {
        name: categoryName,
        amount: existing.amount + (t.amount || 0),
        count: existing.count + 1,
      });
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const report: DailyReport = {
      date: date,
      income: {
        totalAmount: incomeTotal,
        transactionCount: incomeTransactions.length,
        topCounterparties,
      },
      expense: {
        totalAmount: expenseTotal,
        transactionCount: expenseTransactions.length,
        topCategories,
      },
      summary: {
        incomeTotal,
        expenseTotal,
        difference: incomeTotal - expenseTotal,
      },
    };

    // Log to audit
    await this.logReportGeneration(workspaceId, 'daily', date);

    return report;
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(
    workspaceId: string,
    year: number,
    month: number,
  ): Promise<MonthlyReport> {
    const version = await this.getReportsVersion(workspaceId);
    const cacheKey = `reports:monthly:${workspaceId}:${version}:${year}:${month}`;
    const cached = await this.cacheManager.get<MonthlyReport>(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all transactions for the month
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :start', { start: startDate })
      .andWhere('transaction.transactionDate <= :end', { end: endDate })
      .getMany();

    // Calculate daily trends
    const dailyMap = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      const dateKey = t.transactionDate.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { income: 0, expense: 0 };
      if (t.transactionType === TransactionType.INCOME) {
        existing.income += t.amount || 0;
      } else {
        existing.expense += t.amount || 0;
      }
      dailyMap.set(dateKey, existing);
    });

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate category distribution
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
    transactions
      .filter(t => t.transactionType === TransactionType.EXPENSE)
      .forEach(t => {
        const categoryId = t.categoryId || 'uncategorized';
        const categoryName = t.category?.name || 'Без категории';
        const existing = categoryMap.get(categoryId) || { name: categoryName, amount: 0, count: 0 };
        categoryMap.set(categoryId, {
          name: categoryName,
          amount: existing.amount + (t.amount || 0),
          count: existing.count + 1,
        });
      });

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.amount, 0);
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        amount: data.amount,
        percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate counterparty distribution
    const counterpartyMap = new Map<string, { amount: number; count: number }>();
    transactions.forEach(t => {
      const existing = counterpartyMap.get(t.counterpartyName) || { amount: 0, count: 0 };
      counterpartyMap.set(t.counterpartyName, {
        amount: existing.amount + (t.amount || 0),
        count: existing.count + 1,
      });
    });

    const totalAmount = Array.from(counterpartyMap.values()).reduce((sum, c) => sum + c.amount, 0);
    const counterpartyDistribution = Array.from(counterpartyMap.entries())
      .map(([counterpartyName, data]) => ({
        counterpartyName,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);

    // Calculate comparison with previous period
    const previousStartDate = new Date(year, month - 2, 1);
    const previousEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const previousTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :start', { start: previousStartDate })
      .andWhere('transaction.transactionDate <= :end', { end: previousEndDate })
      .getMany();

    const currentIncome = transactions
      .filter(t => t.transactionType === TransactionType.INCOME)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const currentExpense = transactions
      .filter(t => t.transactionType === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const currentDifference = currentIncome - currentExpense;

    const previousIncome = previousTransactions
      .filter(t => t.transactionType === TransactionType.INCOME)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const previousExpense = previousTransactions
      .filter(t => t.transactionType === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const previousDifference = previousIncome - previousExpense;

    const incomeChange = currentIncome - previousIncome;
    const expenseChange = currentExpense - previousExpense;
    const differenceChange = currentDifference - previousDifference;

    const report: MonthlyReport = {
      month: month.toString(),
      year,
      dailyTrends,
      categoryDistribution,
      counterpartyDistribution,
      comparison: {
        currentPeriod: {
          income: currentIncome,
          expense: currentExpense,
          difference: currentDifference,
        },
        previousPeriod: {
          income: previousIncome,
          expense: previousExpense,
          difference: previousDifference,
        },
        change: {
          incomeChange,
          expenseChange,
          differenceChange,
          incomeChangePercent: previousIncome > 0 ? (incomeChange / previousIncome) * 100 : 0,
          expenseChangePercent: previousExpense > 0 ? (expenseChange / previousExpense) * 100 : 0,
          differenceChangePercent:
            previousDifference !== 0 ? (differenceChange / Math.abs(previousDifference)) * 100 : 0,
        },
      },
      summary: {
        totalIncome: currentIncome,
        totalExpense: currentExpense,
        difference: currentDifference,
        transactionCount: transactions.length,
      },
    };

    // Log to audit
    await this.logReportGeneration(
      workspaceId,
      'monthly',
      `${year}-${month.toString().padStart(2, '0')}`,
    );

    return report;
  }

  /**
   * Returns latest transaction date for user (YYYY-MM-DD) and month/year pair
   */
  async getLatestTransactionPeriod(
    workspaceId: string,
  ): Promise<{ date: string | null; year: number | null; month: number | null }> {
    const latest = await this.getLatestTransactionDate(workspaceId);
    if (!latest) {
      return { date: null, year: null, month: null };
    }
    const dt = new Date(latest);
    return {
      date: latest,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
    };
  }

  /**
   * Latest transaction date in ISO (YYYY-MM-DD) or null
   */
  async getLatestTransactionDate(workspaceId: string): Promise<string | null> {
    const latest = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .orderBy('transaction.transactionDate', 'DESC')
      .select('transaction.transactionDate', 'transactionDate')
      .getRawOne<{ transactionDate: Date }>();

    if (!latest?.transactionDate) {
      return null;
    }
    return latest.transactionDate.toISOString().split('T')[0];
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(workspaceId: string, dto: CustomReportDto): Promise<CustomReport> {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);

    // Build query
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :dateFrom', { dateFrom })
      .andWhere('transaction.transactionDate <= :dateTo', { dateTo });

    // Apply filters
    if (dto.categoryId) {
      queryBuilder.andWhere('transaction.categoryId = :categoryId', { categoryId: dto.categoryId });
    }
    if (dto.branchId) {
      queryBuilder.andWhere('transaction.branchId = :branchId', { branchId: dto.branchId });
    }
    if (dto.walletId) {
      queryBuilder.andWhere('transaction.walletId = :walletId', { walletId: dto.walletId });
    }

    const transactions = await queryBuilder.getMany();

    // Group transactions
    const groupMap = new Map<string, CustomReportGroup>();
    const groupBy = dto.groupBy || ReportGroupBy.DAY;

    transactions.forEach(t => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case ReportGroupBy.CATEGORY:
          key = t.categoryId || 'uncategorized';
          label = t.category?.name || 'Без категории';
          break;
        case ReportGroupBy.COUNTERPARTY:
          key = t.counterpartyName;
          label = t.counterpartyName;
          break;
        case ReportGroupBy.BRANCH:
          key = t.branchId || 'unassigned';
          label = t.branch?.name || 'Не назначен';
          break;
        case ReportGroupBy.WALLET:
          key = t.walletId || 'unassigned';
          label = t.wallet?.name || 'Не назначен';
          break;
        case ReportGroupBy.DAY:
          key = t.transactionDate.toISOString().split('T')[0];
          label = t.transactionDate.toLocaleDateString('ru-RU');
          break;
        case ReportGroupBy.MONTH: {
          const month = t.transactionDate.getMonth() + 1;
          const year = t.transactionDate.getFullYear();
          key = `${year}-${month.toString().padStart(2, '0')}`;
          label = `${month.toString().padStart(2, '0')}.${year}`;
          break;
        }
        default:
          key = 'all';
          label = 'Все';
      }

      const existing = groupMap.get(key) || {
        key,
        label,
        totalAmount: 0,
        transactionCount: 0,
        transactions: [],
      };

      existing.totalAmount += t.amount || 0;
      existing.transactionCount += 1;
      existing.transactions.push({
        id: t.id,
        date: t.transactionDate.toISOString().split('T')[0],
        counterparty: t.counterpartyName,
        amount: t.amount || 0,
        category: t.category?.name,
        branch: t.branch?.name,
        wallet: t.wallet?.name,
      });

      groupMap.set(key, existing);
    });

    const groups = Array.from(groupMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    const totalIncome = transactions
      .filter(t => t.transactionType === TransactionType.INCOME)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpense = transactions
      .filter(t => t.transactionType === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const report: CustomReport = {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      groupBy,
      groups,
      summary: {
        totalIncome,
        totalExpense,
        difference: totalIncome - totalExpense,
        transactionCount: transactions.length,
      },
    };

    // Log to audit
    await this.logReportGeneration(workspaceId, 'custom', `${dto.dateFrom}_${dto.dateTo}`);

    return report;
  }

  /**
   * Export report to Excel or CSV
   */
  async exportReport(
    _workspaceId: string,
    dto: ExportReportDto,
    reportData: DailyReport | MonthlyReport | CustomReport,
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `report-${timestamp}.${dto.format === ExportFormat.EXCEL ? 'xlsx' : 'csv'}`;
    const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsBaseDir, 'reports', fileName);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (dto.format === ExportFormat.EXCEL) {
      await this.exportToExcel(reportData, filePath);
    } else {
      await this.exportToCSV(reportData, filePath);
    }

    return { filePath, fileName };
  }

  async exportWorkspaceTransactions(
    workspaceId: string,
    format: WorkspaceExportFormat,
  ): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoin('transaction.statement', 'statement')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.isDuplicate = false')
      .andWhere('(transaction.statementId IS NULL OR statement.deletedAt IS NULL)')
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC')
      .getMany();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extensionMap: Record<WorkspaceExportFormat, string> = {
      [WorkspaceExportFormat.EXCEL]: 'xlsx',
      [WorkspaceExportFormat.PDF]: 'pdf',
      [WorkspaceExportFormat.CSV]: 'csv',
      [WorkspaceExportFormat.DOCX]: 'docx',
    };
    const mimeTypeMap: Record<WorkspaceExportFormat, string> = {
      [WorkspaceExportFormat.EXCEL]:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [WorkspaceExportFormat.PDF]: 'application/pdf',
      [WorkspaceExportFormat.CSV]: 'text/csv',
      [WorkspaceExportFormat.DOCX]:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const normalizedFormat = format || WorkspaceExportFormat.EXCEL;
    const fileName = `workspace-transactions-${timestamp}.${extensionMap[normalizedFormat]}`;
    const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsBaseDir, 'reports', fileName);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (normalizedFormat === WorkspaceExportFormat.EXCEL) {
      await this.generateWorkspaceExcel(transactions, filePath);
    } else if (normalizedFormat === WorkspaceExportFormat.CSV) {
      await this.generateWorkspaceCsv(transactions, filePath);
    } else if (normalizedFormat === WorkspaceExportFormat.PDF) {
      await this.generateWorkspacePdf(transactions, filePath);
    } else {
      await this.generateWorkspaceDocx(transactions, filePath);
    }

    await this.logReportGeneration(workspaceId, 'workspace-transactions', 'all-time');

    return {
      filePath,
      fileName,
      mimeType: mimeTypeMap[normalizedFormat],
    };
  }

  private mapWorkspaceTransactionRows(
    transactions: Transaction[],
  ): WorkspaceTransactionExportRow[] {
    return transactions.map((transaction, index) => ({
      index: index + 1,
      transactionDate: transaction.transactionDate
        ? this.toDateKey(transaction.transactionDate as unknown as Date)
        : '',
      transactionType: transaction.transactionType === TransactionType.INCOME ? 'Приход' : 'Расход',
      counterpartyName: transaction.counterpartyName || '',
      counterpartyBin: transaction.counterpartyBin || '',
      paymentPurpose: transaction.paymentPurpose || '',
      debit: transaction.debit != null ? Number(transaction.debit) : null,
      credit: transaction.credit != null ? Number(transaction.credit) : null,
      amount: transaction.amount != null ? Number(transaction.amount) : null,
      currency: normalizeCurrency(transaction.currency),
      category: transaction.category?.name || 'Без категории',
      branch: transaction.branch?.name || '',
      wallet: transaction.wallet?.name || '',
      documentNumber: transaction.documentNumber || '',
      comments: transaction.comments || '',
    }));
  }

  private buildWorkspaceSummaryRows(rows: WorkspaceTransactionExportRow[]) {
    const totalIncome = rows.reduce((sum, row) => sum + (row.credit || 0), 0);
    const totalExpense = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
    const incomeCount = rows.filter(row => row.transactionType === 'Приход').length;
    const expenseCount = rows.filter(row => row.transactionType === 'Расход').length;

    return [
      { Показатель: 'Всего транзакций', Значение: rows.length },
      { Показатель: 'Приходы', Значение: incomeCount },
      { Показатель: 'Расходы', Значение: expenseCount },
      { Показатель: 'Сумма приходов', Значение: totalIncome },
      { Показатель: 'Сумма расходов', Значение: totalExpense },
      { Показатель: 'Баланс', Значение: totalIncome - totalExpense },
    ];
  }

  private formatWorkspaceAmount(value: number | null): string {
    return formatMoney(value);
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private async generateWorkspaceExcel(
    transactions: Transaction[],
    filePath: string,
  ): Promise<void> {
    const workbook = xlsx.utils.book_new();
    const rows = this.mapWorkspaceTransactionRows(transactions);
    const transactionSheet = xlsx.utils.json_to_sheet(
      rows.map(row => ({
        '№': row.index,
        Дата: row.transactionDate,
        Тип: row.transactionType,
        Контрагент: row.counterpartyName,
        'БИН/ИИН': row.counterpartyBin,
        'Назначение платежа': row.paymentPurpose,
        Дебет: row.debit,
        Кредит: row.credit,
        Сумма: row.amount,
        Валюта: row.currency,
        Категория: row.category,
        Филиал: row.branch,
        Кошелек: row.wallet,
        '№ документа': row.documentNumber,
        Комментарий: row.comments,
      })),
    );

    transactionSheet['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 10 },
      { wch: 28 },
      { wch: 16 },
      { wch: 48 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
    ];

    const summarySheet = xlsx.utils.json_to_sheet(this.buildWorkspaceSummaryRows(rows));
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 18 }];

    xlsx.utils.book_append_sheet(workbook, transactionSheet, 'Транзакции');
    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Сводка');

    xlsx.writeFile(workbook, filePath);
  }

  private async generateWorkspaceCsv(transactions: Transaction[], filePath: string): Promise<void> {
    const rows = this.mapWorkspaceTransactionRows(transactions);
    const headers = [
      '№',
      'Дата',
      'Тип',
      'Контрагент',
      'БИН/ИИН',
      'Назначение платежа',
      'Дебет',
      'Кредит',
      'Сумма',
      'Валюта',
      'Категория',
      'Филиал',
      'Кошелек',
      '№ документа',
      'Комментарий',
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        [
          String(row.index),
          row.transactionDate,
          row.transactionType,
          row.counterpartyName,
          row.counterpartyBin,
          row.paymentPurpose,
          row.debit == null ? '' : String(row.debit),
          row.credit == null ? '' : String(row.credit),
          row.amount == null ? '' : String(row.amount),
          row.currency,
          row.category,
          row.branch,
          row.wallet,
          row.documentNumber,
          row.comments,
        ]
          .map(value => this.escapeCsvValue(value))
          .join(','),
      ),
    ];

    fs.writeFileSync(filePath, `\uFEFF${csvLines.join('\n')}`, 'utf-8');
  }

  private async generateWorkspacePdf(transactions: Transaction[], filePath: string): Promise<void> {
    const rows = this.mapWorkspaceTransactionRows(transactions);
    const summaryRows = this.buildWorkspaceSummaryRows(rows);
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    const pdfMake = this.toPdfMakeModule(pdfMakeModule);
    const pdfFonts = this.toPdfFontsModule(pdfFontsModule);

    pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 24, 20, 24],
      content: [
        { text: 'Отчет по транзакциям workspace', style: 'title' },
        {
          columns: summaryRows.map(row => ({
            stack: [
              { text: String(row.Показатель), style: 'summaryLabel' },
              { text: String(row.Значение), style: 'summaryValue' },
            ],
          })),
          columnGap: 12,
          margin: [0, 0, 0, 16],
        },
        {
          table: {
            headerRows: 1,
            widths: [24, 56, 50, '*', 64, 80],
            body: [
              ['№', 'Дата', 'Тип', 'Контрагент', 'Сумма', 'Категория'],
              ...rows.map(row => [
                String(row.index),
                row.transactionDate,
                row.transactionType,
                row.counterpartyName,
                this.formatWorkspaceAmount(row.amount),
                row.category,
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        title: { bold: true, fontSize: 16, margin: [0, 0, 0, 12] },
        summaryLabel: { fontSize: 9, color: '#6b7280' },
        summaryValue: { fontSize: 11, bold: true },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 8,
      },
    };

    await new Promise<void>(resolve => {
      pdfMake.createPdf(docDefinition).getBuffer((buffer: Uint8Array) => {
        fs.writeFileSync(filePath, Buffer.from(buffer));
        resolve();
      });
    });
  }

  private async generateWorkspaceDocx(
    transactions: Transaction[],
    filePath: string,
  ): Promise<void> {
    const rows = this.mapWorkspaceTransactionRows(transactions);
    const summaryRows = this.buildWorkspaceSummaryRows(rows);
    const docxModule = await import('docx');
    const {
      Document,
      HeadingLevel,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = docxModule;

    const createCell = (text: string, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text,
                bold,
                size: 18,
              }),
            ],
          }),
        ],
      });

    const summaryParagraph = new Paragraph({
      children: summaryRows.flatMap((row, index) => {
        const parts = [
          new TextRun({ text: `${row.Показатель}: `, bold: true, size: 20 }),
          new TextRun({ text: String(row.Значение), size: 20 }),
        ];

        if (index < summaryRows.length - 1) {
          parts.push(new TextRun({ text: '   ', size: 20 }));
        }

        return parts;
      }),
      spacing: { after: 240 },
    });

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createCell('№', true),
            createCell('Дата', true),
            createCell('Тип', true),
            createCell('Контрагент', true),
            createCell('Сумма', true),
            createCell('Категория', true),
          ],
        }),
        ...rows.map(
          row =>
            new TableRow({
              children: [
                createCell(String(row.index)),
                createCell(row.transactionDate),
                createCell(row.transactionType),
                createCell(row.counterpartyName),
                createCell(this.formatWorkspaceAmount(row.amount)),
                createCell(row.category),
              ],
            }),
        ),
      ],
    });

    const document = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation: 'landscape',
              },
            },
          },
          children: [
            new Paragraph({
              text: 'Отчет по транзакциям workspace',
              heading: HeadingLevel.HEADING_1,
            }),
            summaryParagraph,
            table,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);
    fs.writeFileSync(filePath, buffer);
  }

  private async exportToExcel(
    reportData: DailyReport | MonthlyReport | CustomReport,
    filePath: string,
  ): Promise<void> {
    const workbook = xlsx.utils.book_new();

    if ('date' in reportData) {
      // Daily report
      const dailyData = reportData as DailyReport;
      const ws = xlsx.utils.json_to_sheet([
        {
          Тип: 'Приходы',
          Сумма: dailyData.income.totalAmount,
          Количество: dailyData.income.transactionCount,
        },
        {
          Тип: 'Расходы',
          Сумма: dailyData.expense.totalAmount,
          Количество: dailyData.expense.transactionCount,
        },
        { Тип: 'Разница', Сумма: dailyData.summary.difference },
      ]);
      xlsx.utils.book_append_sheet(workbook, ws, 'Отчёт');
    } else if ('month' in reportData) {
      // Monthly report
      const monthlyData = reportData as MonthlyReport;
      const ws = xlsx.utils.json_to_sheet(monthlyData.dailyTrends);
      xlsx.utils.book_append_sheet(workbook, ws, 'Динамика');
    } else {
      // Custom report
      const customData = reportData as CustomReport;
      const rows: CustomReportExportRow[] = [];
      customData.groups.forEach(group => {
        group.transactions.forEach(t => {
          rows.push({
            Группа: group.label,
            Дата: t.date,
            Контрагент: t.counterparty,
            Сумма: t.amount,
            Категория: t.category || '',
            Филиал: t.branch || '',
            Кошелёк: t.wallet || '',
          });
        });
      });
      const ws = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, ws, 'Отчёт');
    }

    xlsx.writeFile(workbook, filePath);
  }

  private async exportToCSV(
    reportData: DailyReport | MonthlyReport | CustomReport,
    filePath: string,
  ): Promise<void> {
    let csvContent = '';

    if ('date' in reportData) {
      // Daily report
      const dailyData = reportData as DailyReport;
      csvContent = 'Тип,Сумма,Количество\n';
      csvContent += `Приходы,${dailyData.income.totalAmount},${dailyData.income.transactionCount}\n`;
      csvContent += `Расходы,${dailyData.expense.totalAmount},${dailyData.expense.transactionCount}\n`;
      csvContent += `Разница,${dailyData.summary.difference},\n`;
    } else if ('month' in reportData) {
      // Monthly report
      const monthlyData = reportData as MonthlyReport;
      csvContent = 'Дата,Приходы,Расходы\n';
      monthlyData.dailyTrends.forEach(trend => {
        csvContent += `${trend.date},${trend.income},${trend.expense}\n`;
      });
    } else {
      // Custom report
      const customData = reportData as CustomReport;
      csvContent = 'Группа,Дата,Контрагент,Сумма,Категория,Филиал,Кошелёк\n';
      customData.groups.forEach(group => {
        group.transactions.forEach(t => {
          csvContent += `${group.label},${t.date},${t.counterparty},${t.amount},${t.category || ''},${t.branch || ''},${t.wallet || ''}\n`;
        });
      });
    }

    fs.writeFileSync(filePath, csvContent, 'utf-8');
  }

  /**
   * Log report generation to audit log
   */
  private async logReportGeneration(
    workspaceId: string,
    reportType: string,
    reportDate: string,
  ): Promise<void> {
    // Audit: record report exports for traceability.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.SYSTEM,
      actorId: null,
      entityType: EntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.EXPORT,
      meta: {
        reportType,
        reportDate,
      },
    });
  }

  async getStatementsSummary(workspaceId: string, days = 30): Promise<StatementsSummaryResponse> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 3650) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeDays);
    since.setHours(0, 0, 0, 0);

    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :since', { since })
      .orderBy('transaction.updatedAt', 'DESC')
      .take(2000)
      .getMany();

    const totals = { income: 0, expense: 0, net: 0, rows: transactions.length };
    const timeseriesMap = new Map<string, { income: number; expense: number }>();
    const categoryMap = new Map<string, { amount: number; rows: number }>();
    const counterpartyMap = new Map<string, { amount: number; rows: number }>();

    const recent = transactions
      .slice(0, 50)
      .map(t => {
        const amount = Number(t.amount || 0);
        const abs = Math.abs(amount);
        const signedAmount = t.transactionType === TransactionType.INCOME ? abs : -abs;
        return {
          id: t.id,
          amount: signedAmount,
          category: t.category?.name || null,
          counterparty: t.counterpartyName || null,
          updatedAt: (t.updatedAt || t.createdAt).toISOString(),
        };
      })
      .slice(0, 20);

    transactions.forEach(t => {
      const amount = Number(t.amount || 0);
      const abs = Math.abs(amount);
      const dateKey = this.toDateKey(t.transactionDate);
      const ts = timeseriesMap.get(dateKey) || { income: 0, expense: 0 };

      if (t.transactionType === TransactionType.INCOME) {
        ts.income += abs;
        const counterparty = (t.counterpartyName || 'Без названия').trim() || 'Без названия';
        const existing = counterpartyMap.get(counterparty) || { amount: 0, rows: 0 };
        counterpartyMap.set(counterparty, {
          amount: existing.amount + abs,
          rows: existing.rows + 1,
        });
        totals.income += abs;
      } else {
        ts.expense += abs;
        const category = (t.category?.name || 'Без категории').trim() || 'Без категории';
        const existing = categoryMap.get(category) || { amount: 0, rows: 0 };
        categoryMap.set(category, { amount: existing.amount + abs, rows: existing.rows + 1 });
        totals.expense += abs;
      }

      timeseriesMap.set(dateKey, ts);
    });

    totals.net = totals.income - totals.expense;

    const timeseries = Array.from(timeseriesMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const counterparties = Array.from(counterpartyMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, rows: data.rows }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { totals, timeseries, categories, counterparties, recent };
  }

  async getTopCategoriesReport(
    workspaceId: string,
    query: TopCategoriesQueryDto,
  ): Promise<TopCategoriesReport> {
    const safeLimit = Number.isFinite(query.limit)
      ? Math.min(Math.max(query.limit || 20, 1), 100)
      : 20;
    const now = new Date();
    const to = query.dateTo ? new Date(query.dateTo) : now;
    const from = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(new Date(to).setDate(to.getDate() - 30));

    const qb = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.statement', 'statement')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :from', { from })
      .andWhere('transaction.transactionDate <= :to', { to });

    if (query.type === 'income') {
      qb.andWhere('transaction.transactionType = :transactionType', {
        transactionType: TransactionType.INCOME,
      });
    } else if (query.type === 'expense') {
      qb.andWhere('transaction.transactionType = :transactionType', {
        transactionType: TransactionType.EXPENSE,
      });
    }

    if (query.bankName) {
      qb.andWhere('statement.bankName = :bankName', { bankName: query.bankName });
    }

    if (query.counterparties) {
      const counterparties = query.counterparties
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (counterparties.length > 0) {
        qb.andWhere('transaction.counterpartyName IN (:...counterparties)', { counterparties });
      }
    }

    if (query.statuses) {
      const statuses = query.statuses
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        qb.andWhere('statement.status IN (:...statuses)', { statuses });
      }
    }

    if (query.keywords) {
      const keyword = `%${query.keywords.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(transaction.counterpartyName) LIKE :keyword OR LOWER(transaction.paymentPurpose) LIKE :keyword OR LOWER(statement.fileName) LIKE :keyword OR LOWER(statement.bankName) LIKE :keyword)',
        { keyword },
      );
    }

    if (Number.isFinite(query.amountMin)) {
      qb.andWhere('ABS(COALESCE(transaction.amount, 0)) >= :amountMin', {
        amountMin: query.amountMin,
      });
    }

    if (Number.isFinite(query.amountMax)) {
      qb.andWhere('ABS(COALESCE(transaction.amount, 0)) <= :amountMax', {
        amountMax: query.amountMax,
      });
    }

    if (query.currencies) {
      const currencies = query.currencies
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (currencies.length > 0) {
        qb.andWhere('transaction.currency IN (:...currencies)', { currencies });
      }
    }

    if (typeof query.billable === 'boolean') {
      if (query.billable) {
        qb.andWhere('ABS(COALESCE(transaction.amount, 0)) > 0');
      } else {
        qb.andWhere('ABS(COALESCE(transaction.amount, 0)) <= 0');
      }
    }

    if (typeof query.approved === 'boolean') {
      if (query.approved) {
        qb.andWhere('statement.status IN (:...approvedStatuses)', {
          approvedStatuses: ['validated', 'completed', 'parsed'],
        });
      } else {
        qb.andWhere('statement.status IN (:...notApprovedStatuses)', {
          notApprovedStatuses: ['uploaded', 'processing', 'error'],
        });
      }
    }

    if (query.has) {
      const hasTokens = query.has
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (hasTokens.includes('errors')) {
        qb.andWhere('(statement.status = :errorStatus OR statement.errorMessage IS NOT NULL)', {
          errorStatus: 'error',
        });
      }
      if (hasTokens.includes('transactions')) {
        qb.andWhere('COALESCE(statement.totalTransactions, 0) > 0');
      }
      if (hasTokens.includes('dateRange')) {
        qb.andWhere(
          '(statement.statementDateFrom IS NOT NULL OR statement.statementDateTo IS NOT NULL)',
        );
      }
      if (hasTokens.includes('currency')) {
        qb.andWhere('statement.currency IS NOT NULL');
      }
    }

    const transactions = await qb.orderBy('transaction.updatedAt', 'DESC').take(5000).getMany();

    const totals = {
      income: 0,
      expense: 0,
      net: 0,
      transactions: transactions.length,
    };

    const categoryMap = new Map<
      string,
      {
        id: string | null;
        name: string;
        amount: number;
        transactions: number;
        type: TransactionType;
        color?: string | null;
        icon?: string | null;
      }
    >();
    const bankMap = new Map<string, { bankName: string; amount: number; statements: number }>();
    const counterpartyMap = new Map<
      string,
      {
        name: string;
        amount: number;
        transactions: number;
        type: TransactionType;
      }
    >();

    transactions.forEach(transaction => {
      const amount = Math.abs(Number(transaction.amount || 0));
      if (!amount) {
        return;
      }

      if (transaction.transactionType === TransactionType.INCOME) {
        totals.income += amount;
      } else {
        totals.expense += amount;
      }

      const categoryKey = transaction.category?.id || 'without-category';
      const categoryName =
        (transaction.category?.name || 'Без категории').trim() || 'Без категории';
      const categoryCurrent = categoryMap.get(categoryKey) || {
        id: transaction.category?.id || null,
        name: categoryName,
        amount: 0,
        transactions: 0,
        type: transaction.transactionType,
        color: transaction.category?.color,
        icon: transaction.category?.icon,
      };
      categoryCurrent.amount += amount;
      categoryCurrent.transactions += 1;
      categoryMap.set(categoryKey, categoryCurrent);

      const bankName = (transaction.statement?.bankName || 'Unknown').trim() || 'Unknown';
      const bankCurrent = bankMap.get(bankName) || {
        bankName,
        amount: 0,
        statements: 0,
      };
      bankCurrent.amount += amount;
      bankCurrent.statements += 1;
      bankMap.set(bankName, bankCurrent);

      const counterpartyName =
        (transaction.counterpartyName || 'Без названия').trim() || 'Без названия';
      const counterpartyCurrent = counterpartyMap.get(counterpartyName) || {
        name: counterpartyName,
        amount: 0,
        transactions: 0,
        type: transaction.transactionType,
      };
      counterpartyCurrent.amount += amount;
      counterpartyCurrent.transactions += 1;
      counterpartyMap.set(counterpartyName, counterpartyCurrent);
    });

    totals.net = totals.income - totals.expense;

    const totalFlow = totals.income + totals.expense;
    const categories = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, safeLimit)
      .map(item => ({
        ...item,
        percentage: totalFlow > 0 ? Number(((item.amount / totalFlow) * 100).toFixed(2)) : 0,
      }));

    const banks = Array.from(bankMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, safeLimit)
      .map(item => ({
        ...item,
        percentage: totalFlow > 0 ? Number(((item.amount / totalFlow) * 100).toFixed(2)) : 0,
      }));

    const counterparties = Array.from(counterpartyMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, safeLimit)
      .map(item => ({
        ...item,
        percentage: totalFlow > 0 ? Number(((item.amount / totalFlow) * 100).toFixed(2)) : 0,
      }));

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      totals,
      categories,
      banks,
      counterparties,
    };
  }

  async getSpendOverTimeReport(
    workspaceId: string,
    query: SpendOverTimeQueryDto,
  ): Promise<{
    groupBy: string;
    dateFrom: string;
    dateTo: string;
    points: Array<{
      period: string;
      label: string;
      income: number;
      expense: number;
      net: number;
      count: number;
    }>;
    totals: {
      income: number;
      expense: number;
      net: number;
      count: number;
      avgPerPeriod: number;
    };
  }> {
    const now = new Date();
    const endDate = query.dateTo ? new Date(query.dateTo) : now;
    const startDate = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(new Date(endDate).setDate(endDate.getDate() - 30));
    const groupBy = query.groupBy || 'day';

    const from = this.toStartOfUtcDay(startDate);
    const to = this.toEndOfUtcDay(endDate);

    const qb = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.statement', 'statement')
      .leftJoin('transaction.category', 'category')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transaction.transactionDate >= :from', { from })
      .andWhere('transaction.transactionDate <= :to', { to });

    if (query.type === 'income') {
      qb.andWhere('transaction.transactionType = :transactionType', {
        transactionType: TransactionType.INCOME,
      });
    } else if (query.type === 'expense') {
      qb.andWhere('transaction.transactionType = :transactionType', {
        transactionType: TransactionType.EXPENSE,
      });
    }

    if (query.bankName) {
      qb.andWhere('statement.bankName = :bankName', { bankName: query.bankName });
    }

    if (query.counterparties) {
      const counterparties = query.counterparties
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (counterparties.length > 0) {
        qb.andWhere('transaction.counterpartyName IN (:...counterparties)', { counterparties });
      }
    }

    if (query.statuses) {
      const statuses = query.statuses
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        qb.andWhere('statement.status IN (:...statuses)', { statuses });
      }
    }

    if (query.keywords) {
      const keyword = `%${query.keywords.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(transaction.counterpartyName) LIKE :keyword OR LOWER(transaction.paymentPurpose) LIKE :keyword OR LOWER(statement.fileName) LIKE :keyword OR LOWER(statement.bankName) LIKE :keyword)',
        { keyword },
      );
    }

    if (Number.isFinite(query.amountMin)) {
      qb.andWhere('ABS(COALESCE(transaction.amount, 0)) >= :amountMin', {
        amountMin: query.amountMin,
      });
    }

    if (Number.isFinite(query.amountMax)) {
      qb.andWhere('ABS(COALESCE(transaction.amount, 0)) <= :amountMax', {
        amountMax: query.amountMax,
      });
    }

    if (query.currencies) {
      const currencies = query.currencies
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (currencies.length > 0) {
        qb.andWhere('transaction.currency IN (:...currencies)', { currencies });
      }
    }

    if (typeof query.billable === 'boolean') {
      if (query.billable) {
        qb.andWhere('ABS(COALESCE(transaction.amount, 0)) > 0');
      } else {
        qb.andWhere('ABS(COALESCE(transaction.amount, 0)) <= 0');
      }
    }

    if (typeof query.approved === 'boolean') {
      if (query.approved) {
        qb.andWhere('statement.status IN (:...approvedStatuses)', {
          approvedStatuses: ['validated', 'completed', 'parsed'],
        });
      } else {
        qb.andWhere('statement.status IN (:...notApprovedStatuses)', {
          notApprovedStatuses: ['uploaded', 'processing', 'error'],
        });
      }
    }

    if (typeof query.exported === 'boolean') {
      if (query.exported) {
        qb.andWhere('statement.processedAt IS NOT NULL');
      } else {
        qb.andWhere('statement.processedAt IS NULL');
      }
    }

    if (typeof query.paid === 'boolean') {
      if (query.paid) {
        qb.andWhere('statement.statementDateTo IS NOT NULL');
      } else {
        qb.andWhere('statement.statementDateTo IS NULL');
      }
    }

    const dayPeriodExpr = "TO_CHAR(transaction.transactionDate, 'YYYY-MM-DD')";
    const monthPeriodExpr = "TO_CHAR(transaction.transactionDate, 'YYYY-MM')";
    const weekPeriodExpr =
      "TO_CHAR(transaction.transactionDate, 'IYYY') || '-W' || TO_CHAR(transaction.transactionDate, 'IW')";
    const quarterPeriodExpr =
      "TO_CHAR(transaction.transactionDate, 'YYYY') || '-Q' || TO_CHAR(transaction.transactionDate, 'Q')";
    const yearPeriodExpr = "TO_CHAR(transaction.transactionDate, 'YYYY')";

    const periodExpr =
      groupBy === 'year'
        ? yearPeriodExpr
        : groupBy === 'quarter'
          ? quarterPeriodExpr
          : groupBy === 'month'
            ? monthPeriodExpr
            : groupBy === 'week'
              ? weekPeriodExpr
              : dayPeriodExpr;

    const rows = await qb
      .select(`${periodExpr}`, 'period')
      .addSelect(
        `SUM(CASE WHEN transaction.transactionType = '${TransactionType.INCOME}' THEN ABS(COALESCE(transaction.amount, 0)) ELSE 0 END)`,
        'income',
      )
      .addSelect(
        `SUM(CASE WHEN transaction.transactionType = '${TransactionType.EXPENSE}' THEN ABS(COALESCE(transaction.amount, 0)) ELSE 0 END)`,
        'expense',
      )
      .addSelect('COUNT(transaction.id)', 'count')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: string; income: string; expense: string; count: string }>();

    const valuesByPeriod = new Map<string, { income: number; expense: number; count: number }>();
    for (const row of rows) {
      valuesByPeriod.set(row.period, {
        income: Number(row.income || 0),
        expense: Number(row.expense || 0),
        count: Number(row.count || 0),
      });
    }

    const points: Array<{
      period: string;
      label: string;
      income: number;
      expense: number;
      net: number;
      count: number;
    }> = [];

    const cursor = this.toStartOfUtcDay(from);
    const endCursor = this.toStartOfUtcDay(to);
    const totals = { income: 0, expense: 0, net: 0, count: 0 };

    while (cursor <= endCursor) {
      let period = '';
      let label = '';

      if (groupBy === 'month') {
        period = this.formatMonthPeriod(cursor);
        label = this.formatMonthLabel(cursor);
      } else if (groupBy === 'quarter') {
        const year = cursor.getUTCFullYear();
        const quarter = Math.floor(cursor.getUTCMonth() / 3) + 1;
        period = `${year}-Q${quarter}`;
        label = `Q${quarter} ${year}`;
      } else if (groupBy === 'year') {
        period = `${cursor.getUTCFullYear()}`;
        label = period;
      } else if (groupBy === 'week') {
        const { year, week } = this.getIsoWeekInfo(cursor);
        const weekString = `${week}`.padStart(2, '0');
        period = `${year}-W${weekString}`;
        label = `Week ${weekString}`;
      } else {
        period = this.toDateKey(cursor);
        label = period;
      }

      const current = valuesByPeriod.get(period) || { income: 0, expense: 0, count: 0 };
      const net = current.income - current.expense;
      points.push({
        period,
        label,
        income: current.income,
        expense: current.expense,
        net,
        count: current.count,
      });

      totals.income += current.income;
      totals.expense += current.expense;
      totals.net += net;
      totals.count += current.count;

      if (groupBy === 'month') {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      } else if (groupBy === 'quarter') {
        cursor.setUTCMonth(cursor.getUTCMonth() + 3, 1);
      } else if (groupBy === 'year') {
        cursor.setUTCFullYear(cursor.getUTCFullYear() + 1, 0, 1);
      } else if (groupBy === 'week') {
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      } else {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      cursor.setUTCHours(0, 0, 0, 0);
    }

    const avgPerPeriod = points.length ? totals.net / points.length : 0;

    return {
      groupBy,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: to.toISOString().split('T')[0],
      points,
      totals: {
        income: totals.income,
        expense: totals.expense,
        net: totals.net,
        count: totals.count,
        avgPerPeriod,
      },
    };
  }

  async generateFromTemplate(
    userId: string,
    dto: GenerateReportDto,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    switch (dto.templateId) {
      case 'pnl':
        return this.generatePnLReport(userId, dto);
      case 'cash-flow':
        return this.generateCashFlowReport(userId, dto);
      case 'expense-by-category':
        return this.generateExpenseByCategoryReport(userId, dto);
      default:
        throw new BadRequestException(`Unknown template: ${dto.templateId}`);
    }
  }

  private async generatePnLReport(
    userId: string,
    dto: GenerateReportDto,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    // 1. Get user workspace
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.workspaceId) {
      throw new BadRequestException('No workspace');
    }

    // 2. Query all transactions in [dateFrom, dateTo] scoped by workspaceId
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    dateTo.setUTCHours(23, 59, 59, 999);

    const transactions = await this.transactionRepository.find({
      where: {
        workspaceId: user.workspaceId,
        isDuplicate: false,
        transactionDate: Between(dateFrom, dateTo),
      },
      relations: ['category'],
    });

    // 3. Group by category, separate income and expense
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    for (const t of transactions) {
      const categoryName = t.category?.name || 'Uncategorized';
      const amount = Math.abs(Number(t.amount || 0));

      if (t.transactionType === TransactionType.INCOME) {
        incomeMap.set(categoryName, (incomeMap.get(categoryName) || 0) + amount);
      } else {
        expenseMap.set(categoryName, (expenseMap.get(categoryName) || 0) + amount);
      }
    }

    const incomeRows = Array.from(incomeMap.entries()).map(([categoryName, total]) => ({
      categoryName,
      total,
    }));
    const expenseRows = Array.from(expenseMap.entries()).map(([categoryName, total]) => ({
      categoryName,
      total,
    }));

    // 4. Calculate totals
    const totalRevenue = incomeRows.reduce((sum, r) => sum + r.total, 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + r.total, 0);
    const netIncome = totalRevenue - totalExpenses;

    // 5. Export based on format
    if (dto.format === 'pdf') {
      throw new BadRequestException('PDF export not yet supported');
    }

    let filePath: string;
    let fileName: string;
    let contentType: string;

    if (dto.format === 'excel') {
      const wb = xlsx.utils.book_new();
      const rows: (string | number)[][] = [];

      rows.push(['P&L Report', '', '', user.workspaceId]);
      rows.push(['Period:', dto.dateFrom, 'to', dto.dateTo]);
      rows.push([]);
      rows.push(['Category', 'Type', 'Amount']);

      rows.push(['--- REVENUE ---', '', '']);
      for (const row of incomeRows) {
        rows.push([row.categoryName, 'Income', row.total]);
      }
      rows.push(['TOTAL REVENUE', '', totalRevenue]);

      rows.push([]);

      rows.push(['--- EXPENSES ---', '', '']);
      for (const row of expenseRows) {
        rows.push([row.categoryName, 'Expense', row.total]);
      }
      rows.push(['TOTAL EXPENSES', '', totalExpenses]);

      rows.push([]);
      rows.push(['NET INCOME', '', netIncome]);

      const ws = xlsx.utils.aoa_to_sheet(rows);
      xlsx.utils.book_append_sheet(wb, ws, 'P&L');

      fileName = `pnl-${dto.dateFrom}-${dto.dateTo}.xlsx`;
      filePath = path.join(os.tmpdir(), fileName);
      xlsx.writeFile(wb, filePath);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // csv
      const csvRows: (string | number)[][] = [
        ['Category', 'Type', 'Amount'],
        ...incomeRows.map(r => [r.categoryName, 'Income', r.total]),
        ['TOTAL REVENUE', '', totalRevenue],
        ...expenseRows.map(r => [r.categoryName, 'Expense', r.total]),
        ['TOTAL EXPENSES', '', totalExpenses],
        ['NET INCOME', '', netIncome],
      ];
      const csvContent = csvRows.map(r => r.join(',')).join('\n');
      fileName = `pnl-${dto.dateFrom}-${dto.dateTo}.csv`;
      filePath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      contentType = 'text/csv';
    }

    // Save report history
    await this.reportHistoryRepo.save({
      workspaceId: user.workspaceId,
      userId: user.id,
      templateId: 'pnl',
      templateName: 'Profit & Loss (P&L)',
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      format: dto.format,
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size,
    });

    return { filePath, fileName, contentType };
  }

  private async generateCashFlowReport(
    userId: string,
    dto: GenerateReportDto,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.workspaceId) {
      throw new BadRequestException('No workspace');
    }

    if (dto.format === 'pdf') {
      throw new BadRequestException('PDF export not yet supported');
    }

    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    dateTo.setUTCHours(23, 59, 59, 999);

    const transactions = await this.transactionRepository.find({
      where: {
        workspaceId: user.workspaceId,
        isDuplicate: false,
        transactionDate: Between(dateFrom, dateTo),
      },
      relations: ['category'],
    });

    // Group by date (daily buckets)
    const bucketMap = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const dateKey = new Date(t.transactionDate).toISOString().slice(0, 10);
      if (!bucketMap.has(dateKey)) {
        bucketMap.set(dateKey, { income: 0, expense: 0 });
      }
      const bucket = bucketMap.get(dateKey);
      if (!bucket) {
        continue;
      }
      const amount = Math.abs(Number(t.amount || 0));
      if (t.transactionType === TransactionType.INCOME) {
        bucket.income += amount;
      } else {
        bucket.expense += amount;
      }
    }

    // Sort by date ascending
    const sortedBuckets = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { income, expense }]) => ({ date, income, expense, net: income - expense }));

    const totalIncome = sortedBuckets.reduce((sum, r) => sum + r.income, 0);
    const totalExpense = sortedBuckets.reduce((sum, r) => sum + r.expense, 0);
    const totalNet = totalIncome - totalExpense;

    let filePath: string;
    let fileName: string;
    let contentType: string;

    if (dto.format === 'excel') {
      const wb = xlsx.utils.book_new();
      const rows: (string | number)[][] = [];

      rows.push(['Cash Flow Statement', '', '', user.workspaceId]);
      rows.push(['Period:', dto.dateFrom, 'to', dto.dateTo]);
      rows.push([]);
      rows.push(['Date', 'Income', 'Expense', 'Net']);

      for (const row of sortedBuckets) {
        rows.push([row.date, row.income, row.expense, row.net]);
      }

      rows.push([]);
      rows.push(['TOTAL', totalIncome, totalExpense, totalNet]);

      const ws = xlsx.utils.aoa_to_sheet(rows);
      xlsx.utils.book_append_sheet(wb, ws, 'Cash Flow');

      fileName = `cash-flow-${dto.dateFrom}-${dto.dateTo}.xlsx`;
      filePath = path.join(os.tmpdir(), fileName);
      xlsx.writeFile(wb, filePath);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // csv
      const csvRows: (string | number)[][] = [
        ['Date', 'Income', 'Expense', 'Net'],
        ...sortedBuckets.map(r => [r.date, r.income, r.expense, r.net]),
        ['TOTAL', totalIncome, totalExpense, totalNet],
      ];
      const csvContent = csvRows.map(r => r.join(',')).join('\n');
      fileName = `cash-flow-${dto.dateFrom}-${dto.dateTo}.csv`;
      filePath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      contentType = 'text/csv';
    }

    await this.reportHistoryRepo.save({
      workspaceId: user.workspaceId,
      userId: user.id,
      templateId: 'cash-flow',
      templateName: 'Cash Flow Statement',
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      format: dto.format,
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size,
    });

    return { filePath, fileName, contentType };
  }

  private async generateExpenseByCategoryReport(
    userId: string,
    dto: GenerateReportDto,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.workspaceId) {
      throw new BadRequestException('No workspace');
    }

    if (dto.format === 'pdf') {
      throw new BadRequestException('PDF export not yet supported');
    }

    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    dateTo.setUTCHours(23, 59, 59, 999);

    const transactions = await this.transactionRepository.find({
      where: {
        workspaceId: user.workspaceId,
        isDuplicate: false,
        transactionDate: Between(dateFrom, dateTo),
        transactionType: TransactionType.EXPENSE,
      },
      relations: ['category'],
    });

    // Group by category name
    const categoryMap = new Map<string, { total: number; count: number }>();

    for (const t of transactions) {
      const categoryName = t.category?.name || 'Uncategorized';
      const amount = Math.abs(Number(t.amount || 0));
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { total: 0, count: 0 });
      }
      const entry = categoryMap.get(categoryName);
      if (!entry) {
        continue;
      }
      entry.total += amount;
      entry.count += 1;
    }

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, e) => sum + e.total, 0);

    // Sort by amount descending
    const categoryRows = Array.from(categoryMap.entries())
      .map(([categoryName, { total, count }]) => ({
        categoryName,
        total,
        count,
        percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    let filePath: string;
    let fileName: string;
    let contentType: string;

    if (dto.format === 'excel') {
      const wb = xlsx.utils.book_new();
      const rows: (string | number)[][] = [];

      rows.push(['Expense by Category', '', '', user.workspaceId]);
      rows.push(['Period:', dto.dateFrom, 'to', dto.dateTo]);
      rows.push([]);
      rows.push(['Category', 'Total Amount', 'Transaction Count', '% of Total']);

      for (const row of categoryRows) {
        rows.push([row.categoryName, row.total, row.count, Number(row.percentage.toFixed(2))]);
      }

      rows.push([]);
      rows.push(['TOTAL', totalExpenses, categoryRows.reduce((s, r) => s + r.count, 0), 100]);

      const ws = xlsx.utils.aoa_to_sheet(rows);
      xlsx.utils.book_append_sheet(wb, ws, 'Expense by Category');

      fileName = `expense-by-category-${dto.dateFrom}-${dto.dateTo}.xlsx`;
      filePath = path.join(os.tmpdir(), fileName);
      xlsx.writeFile(wb, filePath);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // csv
      const csvRows: (string | number)[][] = [
        ['Category', 'Total Amount', 'Transaction Count', '% of Total'],
        ...categoryRows.map(r => [
          r.categoryName,
          r.total,
          r.count,
          Number(r.percentage.toFixed(2)),
        ]),
        ['TOTAL', totalExpenses, categoryRows.reduce((s, r) => s + r.count, 0), 100],
      ];
      const csvContent = csvRows.map(r => r.join(',')).join('\n');
      fileName = `expense-by-category-${dto.dateFrom}-${dto.dateTo}.csv`;
      filePath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      contentType = 'text/csv';
    }

    await this.reportHistoryRepo.save({
      workspaceId: user.workspaceId,
      userId: user.id,
      templateId: 'expense-by-category',
      templateName: 'Expense by Category',
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      format: dto.format,
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size,
    });

    return { filePath, fileName, contentType };
  }

  async getReportHistory(userId: string): Promise<ReportHistory[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });

    if (!user?.workspaceId) {
      return [];
    }

    return this.reportHistoryRepo.find({
      where: { workspaceId: user.workspaceId },
      order: { generatedAt: 'DESC' },
      take: 50,
      relations: ['user'],
    });
  }

  async downloadHistoryReport(
    userId: string,
    reportId: string,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });

    if (!user?.workspaceId) {
      throw new NotFoundException('Report not found');
    }

    const report = await this.reportHistoryRepo.findOne({
      where: { id: reportId, workspaceId: user.workspaceId },
    });

    if (!(report?.filePath && report.fileName && fs.existsSync(report.filePath))) {
      throw new NotFoundException('Report file not found');
    }

    const format = String(report.format || '').toLowerCase();
    const contentType =
      format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : format === 'csv'
          ? 'text/csv'
          : 'application/pdf';

    return {
      filePath: report.filePath,
      fileName: report.fileName,
      contentType,
    };
  }
}
