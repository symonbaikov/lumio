import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, type Repository, type SelectQueryBuilder } from 'typeorm';
import * as xlsx from 'xlsx';
import { ensureCanEdit } from '../../common/utils/ensure-can-edit.util';
import { normalizeFilename } from '../../common/utils/filename.util';
import { generateTransactionFingerprint } from '../../common/utils/fingerprint.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import {
  ActorType,
  AuditAction,
  type AuditEventDiff,
  EntityType,
  Severity,
} from '../../entities/audit-event.entity';
import { Category } from '../../entities/category.entity';
import { CustomTableCellStyle } from '../../entities/custom-table-cell-style.entity';
import { CustomTableColumnStyle } from '../../entities/custom-table-column-style.entity';
import {
  CustomTableColumn,
  CustomTableColumnType,
} from '../../entities/custom-table-column.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTable, CustomTableSource } from '../../entities/custom-table.entity';
import { DataEntryCustomField } from '../../entities/data-entry-custom-field.entity';
import { DataEntry, DataEntryType } from '../../entities/data-entry.entity';
import { BankName, FileType, Statement, StatementStatus } from '../../entities/statement.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { AuditService } from '../audit/audit.service';
import type { BatchCreateCustomTableRowsDto } from './dto/batch-create-custom-table-rows.dto';
import type { ClassifyPaidStatusDto } from './dto/classify-paid-status.dto';
import type { CreateCustomTableColumnDto } from './dto/create-custom-table-column.dto';
import type { CreateCustomTableFromDataEntryCustomTabDto } from './dto/create-custom-table-from-data-entry-custom-tab.dto';
import {
  type CreateCustomTableFromDataEntryDto,
  DataEntryToCustomTableScope,
} from './dto/create-custom-table-from-data-entry.dto';
import type { CreateCustomTableFromStatementsDto } from './dto/create-custom-table-from-statements.dto';
import type { CreateCustomTableRowDto } from './dto/create-custom-table-row.dto';
import type { CreateCustomTableDto } from './dto/create-custom-table.dto';
import {
  CUSTOM_TABLE_AGGREGATE_FNS,
  type CustomTableAggregateDto,
  type CustomTableAggregateFn,
  type CustomTableAggregateResult,
  type CustomTableRowFilterDto,
  type CustomTableRowSortDto,
} from './dto/list-custom-table-rows.dto';
import type { ReorderCustomTableColumnsDto } from './dto/reorder-custom-table-columns.dto';
import type { UpdateCustomTableColumnDto } from './dto/update-custom-table-column.dto';
import type { UpdateCustomTableRowDto } from './dto/update-custom-table-row.dto';
import type { UpdateCustomTableViewSettingsColumnDto } from './dto/update-custom-table-view-settings.dto';
import type { UpdateCustomTableViewsDto } from './dto/update-custom-table-views.dto';
import type { UpdateCustomTableDto } from './dto/update-custom-table.dto';
import { AiColumnFiller } from './helpers/ai-column.helper';
import { AiPaidStatusClassifier, type PaidStatusInput } from './helpers/ai-paid-status.helper';
import { assertValidFormula, evaluateFormula } from './helpers/formula-evaluator';

type DataEntryFieldKey = 'date' | 'type' | 'amount' | 'currency' | 'note';
type JsonObject = Record<string, unknown>;
type RowDataValue = string | number | boolean | null | undefined | JsonObject | RowDataValue[];
type RowDataRecord = Record<string, RowDataValue>;
type ColumnSourceConfig = {
  kind?: string;
  field?: string;
  name?: string;
  colIndex?: number;
};
type DriverErrorLike = { driverError?: { code?: string } };
type RowStylesRecord = Record<string, JsonObject>;
type CustomTableWithViewSettings = CustomTable & { viewSettings?: JsonObject };
type ColumnWithStyle = CustomTableColumn & { style?: CustomTableColumnStyle['style'] | null };
type ColumnDefinitionConfig = JsonObject | null;
type RowInsertData = Record<string, string | number | null>;
/**
 * Деньги — это число с оформлением: сравнения, сортировка, итоги и выгрузка
 * обязаны обращаться с ними так же, как с NUMBER.
 */
function isNumericColumnType(columnType: CustomTableColumnType): boolean {
  return (
    columnType === CustomTableColumnType.NUMBER || columnType === CustomTableColumnType.CURRENCY
  );
}

type ViewSettingsColumns = Record<string, { width?: number; aggregate?: CustomTableAggregateFn }>;
type QueryParams = Record<string, string | number | boolean | string[] | number[] | null>;
type ConversionField = 'date' | 'amount' | 'merchant' | 'purpose' | 'article' | 'currency';
type ConversionMapping = Partial<Record<ConversionField, string>>;
type ConvertedTransactionInput = {
  rowNumber: number;
  transactionDate: Date;
  merchant: string;
  purpose: string;
  amount: number;
  currency: string;
  article: string | null;
};

@Injectable()
export class CustomTablesService {
  private readonly logger = new Logger(CustomTablesService.name);

  /** Потолок выгрузки: воркбук собирается в памяти, безлимит означал бы OOM. */
  private static readonly MAX_EXPORT_ROWS = 100_000;

  constructor(
    @InjectRepository(CustomTable)
    private readonly customTableRepository: Repository<CustomTable>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CustomTableColumn)
    private readonly customTableColumnRepository: Repository<CustomTableColumn>,
    @InjectRepository(CustomTableRow)
    private readonly customTableRowRepository: Repository<CustomTableRow>,
    @InjectRepository(CustomTableColumnStyle)
    private readonly customTableColumnStyleRepository: Repository<CustomTableColumnStyle>,
    @InjectRepository(CustomTableCellStyle)
    private readonly customTableCellStyleRepository: Repository<CustomTableCellStyle>,
    @InjectRepository(DataEntry)
    private readonly dataEntryRepository: Repository<DataEntry>,
    @InjectRepository(DataEntryCustomField)
    private readonly dataEntryCustomFieldRepository: Repository<DataEntryCustomField>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly auditService: AuditService,
  ) {}

  private getDriverErrorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null
      ? (error as DriverErrorLike).driverError?.code
      : undefined;
  }

  private toRowDataRecord(data: unknown): RowDataRecord {
    return typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as RowDataRecord)
      : {};
  }

  private getRowDataValue(data: Record<string, unknown>, key: string): unknown {
    return data[key];
  }

  private getColumnSourceConfig(
    config: CustomTableColumn['config'] | null | undefined,
  ): ColumnSourceConfig | null {
    if (!config || typeof config !== 'object') {
      return null;
    }
    const source = (config as { source?: unknown }).source;
    return typeof source === 'object' && source !== null ? (source as ColumnSourceConfig) : null;
  }

  private getJsonMeta(meta?: JsonObject | null): JsonObject | null {
    return meta ?? null;
  }

  private getViewSettingsObject(table: CustomTable): JsonObject {
    return table.viewSettings && typeof table.viewSettings === 'object'
      ? (table.viewSettings as JsonObject)
      : {};
  }

  private getViewSettingsColumns(viewSettings: JsonObject): ViewSettingsColumns {
    const columns = viewSettings.columns;
    return typeof columns === 'object' && columns !== null ? (columns as ViewSettingsColumns) : {};
  }

  private attachColumnStyles(
    columns: CustomTableColumn[],
    stylesByKey: Map<string, CustomTableColumnStyle['style']>,
  ): ColumnWithStyle[] {
    return columns.map(column => {
      const columnWithStyle = column as ColumnWithStyle;
      columnWithStyle.style = stylesByKey.get(column.key) || null;
      return columnWithStyle;
    });
  }

  private mergeRowStyles(
    rows: CustomTableRow[],
    cellStyles: CustomTableCellStyle[],
  ): CustomTableRow[] {
    const stylesByRowId = new Map<string, JsonObject>();
    rows.forEach(row => {
      if (row.styles && typeof row.styles === 'object') {
        stylesByRowId.set(row.id, row.styles as JsonObject);
      }
    });

    const byRow: RowStylesRecord = {};
    for (const style of cellStyles) {
      const current = byRow[style.rowId] || {};
      current[style.columnKey] = style.style as JsonObject;
      byRow[style.rowId] = current;
    }

    rows.forEach(row => {
      row.styles = {
        ...(byRow[row.id] || {}),
        ...(stylesByRowId.get(row.id) || {}),
      };
    });

    return rows;
  }

  private throwHelpfulSchemaError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const code = this.getDriverErrorCode(error);
      if (code === '42P01' || code === '42703') {
        throw new BadRequestException(
          'Схема БД не обновлена для Custom Tables. Запустите миграции (`npm -C backend run migration:run`) или включите автозапуск миграций (переменная окружения `RUN_MIGRATIONS=true`) и перезапустите backend.',
        );
      }
    }
    throw error;
  }

  private async ensureCanEditCustomTables(userId: string, workspaceId: string): Promise<void> {
    await ensureCanEdit(
      this.workspaceMemberRepository,
      workspaceId,
      userId,
      'canEditCustomTables',
      'Недостаточно прав для редактирования таблиц',
    );
  }

  private async ensureCanEditStatements(userId: string, workspaceId: string): Promise<void> {
    await ensureCanEdit(
      this.workspaceMemberRepository,
      workspaceId,
      userId,
      'canEditStatements',
      'Недостаточно прав для редактирования выписок',
    );
  }

  private normalizeColumnText(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase();
  }

  private getColumnSearchText(column: CustomTableColumn): string {
    const source = this.getColumnSourceConfig(column.config);
    return [column.title, column.key, source?.field, source?.name, source?.kind]
      .map(value => this.normalizeColumnText(value))
      .filter(Boolean)
      .join(' ');
  }

  private findConversionColumnKey(
    columns: CustomTableColumn[],
    tokens: string[],
  ): string | undefined {
    const normalizedTokens = tokens.map(token => token.toLowerCase());
    const exact = columns.find(column => {
      const source = this.getColumnSourceConfig(column.config);
      const sourceField = this.normalizeColumnText(source?.field);
      return sourceField && normalizedTokens.includes(sourceField);
    });
    if (exact) {
      return exact.key;
    }
    return columns.find(column => {
      const haystack = this.getColumnSearchText(column);
      return normalizedTokens.some(token => haystack.includes(token));
    })?.key;
  }

  private buildConversionMapping(columns: CustomTableColumn[]): ConversionMapping {
    return {
      date: this.findConversionColumnKey(columns, ['date', 'дата']),
      amount: this.findConversionColumnKey(columns, ['amount', 'сумма', 'debit', 'расход']),
      merchant: this.findConversionColumnKey(columns, [
        'merchant',
        'counterparty',
        'контрагент',
        'поставщик',
      ]),
      purpose: this.findConversionColumnKey(columns, [
        'purpose',
        'description',
        'назначение',
        'описание',
      ]),
      article: this.findConversionColumnKey(columns, ['article', 'статья']),
      currency: this.findConversionColumnKey(columns, ['currency', 'валюта']),
    };
  }

  private readScalarString(data: RowDataRecord, key?: string): string {
    if (!key) {
      return '';
    }
    const value = this.getRowDataValue(data, key);
    if (
      value === null ||
      value === undefined ||
      Array.isArray(value) ||
      typeof value === 'object'
    ) {
      return '';
    }
    return String(value).trim();
  }

  private parseConversionDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (value === null || value === undefined) {
      return null;
    }
    const raw = String(value).trim();
    if (!raw) {
      return null;
    }
    const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    const parsed = new Date(dateOnly ? `${dateOnly}T00:00:00.000Z` : raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parsePositiveAmount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const normalized =
      typeof value === 'number'
        ? value
        : Number(
            String(value)
              .trim()
              .replace(/\s+/g, '')
              .replace(',', '.')
              .replace(/[^\d.-]/g, ''),
          );
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return null;
    }
    return Number(normalized.toFixed(2));
  }

  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }

  private buildConvertedCsv(rows: ConvertedTransactionInput[]): Buffer {
    const lines = [
      'date,merchant,purpose,article,amount,currency',
      ...rows.map(row =>
        [
          this.toDateOnly(row.transactionDate),
          this.escapeCsvValue(row.merchant),
          this.escapeCsvValue(row.purpose),
          this.escapeCsvValue(row.article || ''),
          row.amount.toFixed(2),
          row.currency,
        ].join(','),
      ),
    ];
    return Buffer.from(lines.join('\n'), 'utf8');
  }

  private async findConvertedStatement(
    workspaceId: string,
    tableId: string,
  ): Promise<Statement | null> {
    try {
      return await this.statementRepository
        .createQueryBuilder('statement')
        .where('statement.workspaceId = :workspaceId', { workspaceId })
        .andWhere('statement.deletedAt IS NULL')
        .andWhere("statement.parsingDetails -> 'importPreview' ->> 'source' = :source", {
          source: 'custom-table-conversion',
        })
        .andWhere("statement.parsingDetails -> 'importPreview' ->> 'customTableId' = :tableId", {
          tableId,
        })
        .getOne();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
  }

  private async resolveCategoryId(workspaceId: string, categoryId: string): Promise<string> {
    let category: Category | null = null;
    try {
      const qb = this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.user', 'owner')
        .where('category.id = :categoryId', { categoryId })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId });

      category = await qb.getOne();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }
    return category.id;
  }

  private async requireTable(workspaceId: string, tableId: string): Promise<CustomTable> {
    if (!this.isUuid(tableId)) {
      throw new BadRequestException('Некорректный идентификатор таблицы');
    }
    try {
      const qb = this.customTableRepository
        .createQueryBuilder('table')
        .leftJoinAndSelect('table.user', 'owner')
        .where('table.id = :tableId', { tableId })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId });

      const table = await qb.getOne();
      if (!table) {
        throw new NotFoundException('Таблица не найдена');
      }
      return table;
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    throw new NotFoundException('Таблица не найдена');
  }

  private generateColumnKey(): string {
    const raw = randomUUID().replace(/-/g, '');
    return `col_${raw.slice(0, 12)}`;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private sanitizeRowData(
    data: Record<string, unknown>,
    allowedKeys: Set<string>,
  ): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedKeys.has(key)) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private async getAllowedColumnKeys(tableId: string): Promise<Set<string>> {
    const columns = await this.customTableColumnRepository.find({
      where: { tableId },
      select: ['key'],
    });
    return new Set(columns.map(c => c.key));
  }

  private getPaidStatusFieldKeys(columns: CustomTableColumn[]): {
    commentKeys: string[];
    counterpartyKeys: string[];
  } {
    const commentPatterns = [
      /comment/i,
      /purpose/i,
      /description/i,
      /note/i,
      /memo/i,
      /details/i,
      /назнач/i,
      /комментар/i,
      /описан/i,
      /примеч/i,
      /платеж/i,
    ];
    const counterpartyPatterns = [
      /counterparty/i,
      /merchant/i,
      /supplier/i,
      /partner/i,
      /vendor/i,
      /payer/i,
      /receiver/i,
      /beneficiar/i,
      /контраг/i,
      /получател/i,
      /плательщик/i,
      /бенефиц/i,
    ];

    const commentKeys: string[] = [];
    const counterpartyKeys: string[] = [];
    for (const column of columns) {
      const hay = `${column.title || ''} ${column.key || ''}`.toLowerCase();
      if (commentPatterns.some(re => re.test(hay))) {
        commentKeys.push(column.key);
      }
      if (counterpartyPatterns.some(re => re.test(hay))) {
        counterpartyKeys.push(column.key);
      }
    }
    return { commentKeys, counterpartyKeys };
  }

  private collectRowText(data: Record<string, unknown>, keys: string[]): string {
    if (!data || typeof data !== 'object') {
      return '';
    }
    const parts: string[] = [];
    for (const key of keys) {
      const value = this.getRowDataValue(data, key);
      if (value === null || value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === null || item === undefined) {
            continue;
          }
          if (typeof item === 'object') {
            continue;
          }
          const str = String(item).trim();
          if (str) {
            parts.push(str);
          }
        }
        continue;
      }
      if (typeof value === 'object') {
        continue;
      }
      const str = String(value).trim();
      if (str) {
        parts.push(str);
      }
    }
    return parts.join(' ').trim();
  }

  private getDataEntryColumnMapping(columns: CustomTableColumn[]): {
    fieldKeyByName: Partial<Record<DataEntryFieldKey, string>>;
    customFieldKeyByName: Map<string, string>;
  } {
    const fieldKeyByName: Partial<Record<DataEntryFieldKey, string>> = {};
    const customFieldKeyByName = new Map<string, string>();
    const titleToField: Record<string, DataEntryFieldKey> = {
      дата: 'date',
      тип: 'type',
      сумма: 'amount',
      валюта: 'currency',
      комментарий: 'note',
    };

    for (const column of columns) {
      const source = this.getColumnSourceConfig(column.config);
      if (source?.kind === 'data_entry_field' && source.field && !fieldKeyByName[source.field]) {
        fieldKeyByName[source.field as DataEntryFieldKey] = column.key;
      }
      if (
        source?.kind === 'data_entry_custom_tab' &&
        source.field &&
        !fieldKeyByName[source.field]
      ) {
        fieldKeyByName[source.field as DataEntryFieldKey] = column.key;
      }
      if (
        source?.kind === 'data_entry_custom_field' &&
        source.name &&
        !customFieldKeyByName.has(source.name)
      ) {
        customFieldKeyByName.set(source.name, column.key);
      }

      const normalizedTitle = column.title?.trim().toLowerCase();
      const fallbackField = normalizedTitle ? titleToField[normalizedTitle] : undefined;
      if (fallbackField && !fieldKeyByName[fallbackField]) {
        fieldKeyByName[fallbackField] = column.key;
      }
    }

    return { fieldKeyByName, customFieldKeyByName };
  }

  private async getNextColumnPosition(tableId: string): Promise<number> {
    const raw = await this.customTableColumnRepository
      .createQueryBuilder('c')
      .select('MAX(c.position)', 'max')
      .where('c.tableId = :tableId', { tableId })
      .getRawOne<{ max: string | null }>();

    const max = raw?.max ? Number(raw.max) : 0;
    return Number.isFinite(max) ? max + 1 : 1;
  }

  private async getNextRowNumber(tableId: string): Promise<number> {
    const raw = await this.customTableRowRepository
      .createQueryBuilder('r')
      .select('MAX(r.rowNumber)', 'max')
      .where('r.tableId = :tableId', { tableId })
      .getRawOne<{ max: string | null }>();

    const max = raw?.max ? Number(raw.max) : 0;
    return Number.isFinite(max) ? max + 1 : 1;
  }

  private async logEvent(params: {
    userId: string;
    workspaceId: string | null;
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    diff?: AuditEventDiff | null;
    meta?: JsonObject | null;
    batchId?: string | null;
    severity?: Severity;
    isUndoable?: boolean;
  }) {
    try {
      // Audit: capture custom table mutations (tables, columns, rows, cells).
      await this.auditService.createEvent({
        workspaceId: params.workspaceId,
        actorType: ActorType.USER,
        actorId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        diff: params.diff ?? null,
        meta: params.meta ?? null,
        batchId: params.batchId ?? null,
        severity: params.severity ?? Severity.INFO,
        isUndoable: params.isUndoable,
      });
    } catch (error) {
      this.logger.warn(
        `Audit event write failed for action=${params.action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async logRowBatchCreate(params: {
    userId: string;
    workspaceId: string | null;
    tableId: string;
    rows: CustomTableRow[];
    meta?: JsonObject;
  }) {
    if (!params.rows.length) {
      return;
    }
    try {
      await this.auditService.createBatchEvents(
        params.rows.map(row => ({
          workspaceId: params.workspaceId,
          actorType: ActorType.USER,
          actorId: params.userId,
          entityType: EntityType.TABLE_ROW,
          entityId: row.id,
          action: AuditAction.CREATE,
          diff: { before: null, after: row },
          meta: { tableId: params.tableId, rowNumber: row.rowNumber, ...(params.meta || {}) },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Audit event batch write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createTable(
    userId: string,
    workspaceId: string,
    dto: CreateCustomTableDto,
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const categoryId =
      dto.categoryId === null || dto.categoryId === undefined
        ? null
        : await this.resolveCategoryId(workspaceId, dto.categoryId);

    const table = this.customTableRepository.create({
      userId,
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      source: CustomTableSource.MANUAL,
      categoryId,
    });

    let saved: CustomTable;
    try {
      saved = await this.customTableRepository.save(table);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: saved.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: saved },
      meta: { name: saved.name },
    });
    return saved;
  }

  async listTables(workspaceId: string): Promise<CustomTable[]> {
    try {
      const qb = this.customTableRepository
        .createQueryBuilder('table')
        .leftJoinAndSelect('table.category', 'category')
        .leftJoin('table.user', 'owner')
        .where('owner.workspaceId = :workspaceId', { workspaceId })
        .orderBy('table.createdAt', 'DESC');

      return await qb.getMany();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
  }

  async getTable(workspaceId: string, tableId: string): Promise<CustomTable> {
    await this.requireTable(workspaceId, tableId);
    let table: CustomTable | null = null;
    try {
      table = await this.customTableRepository.findOne({
        where: { id: tableId },
        relations: { columns: true, category: true },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!table) {
      throw new NotFoundException('Таблица не найдена');
    }

    table.columns = (table.columns || []).sort((a, b) => a.position - b.position);

    try {
      const styles = await this.customTableColumnStyleRepository.find({
        where: { tableId },
        select: ['columnKey', 'style'],
      });
      const byKey = new Map(styles.map(s => [s.columnKey, s.style]));
      table.columns = this.attachColumnStyles(table.columns, byKey);
    } catch (_error) {
      this.logger.warn(`Failed to load column styles for tableId=${tableId}`);
    }

    return table;
  }

  async updateTable(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: UpdateCustomTableDto,
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);
    const before = { ...table };
    if (dto.name !== undefined) {
      table.name = dto.name;
    }
    if (dto.description !== undefined) {
      table.description = dto.description ?? null;
    }
    if (dto.categoryId !== undefined) {
      table.categoryId =
        dto.categoryId === null ? null : await this.resolveCategoryId(workspaceId, dto.categoryId);
    }
    let saved: CustomTable;
    try {
      saved = await this.customTableRepository.save(table);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: saved.id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
    });
    return saved;
  }

  async createFromDataEntry(
    userId: string,
    workspaceId: string,
    dto: CreateCustomTableFromDataEntryDto,
  ): Promise<{ tableId: string; columnsCreated: number; rowsCreated: number }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const selectedType = dto.scope === DataEntryToCustomTableScope.TYPE ? dto.type : undefined;

    let entries: DataEntry[];
    try {
      const qb = this.dataEntryRepository
        .createQueryBuilder('entry')
        .leftJoin('entry.user', 'owner')
        .where('owner.workspaceId = :workspaceId', { workspaceId })
        .orderBy('entry.date', 'ASC')
        .addOrderBy('entry.createdAt', 'ASC');

      if (selectedType) {
        qb.andWhere('entry.type = :type', { type: selectedType });
      }

      entries = await qb.getMany();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    if (!entries.length) {
      throw new BadRequestException('Нет записей во «Ввод данных» для создания таблицы');
    }

    const typeLabels: Record<DataEntryType, string> = {
      [DataEntryType.CASH]: 'Наличные',
      [DataEntryType.RAW]: 'Сырьё',
      [DataEntryType.DEBIT]: 'Дебет',
      [DataEntryType.CREDIT]: 'Кредит',
    };

    const defaultName = selectedType
      ? `Ввод данных — ${typeLabels[selectedType] || selectedType}`
      : 'Ввод данных — все';
    const tableName = dto.name?.trim() || defaultName;
    const description = dto.description === undefined ? null : dto.description;

    const customFieldMetaByName = new Map<string, { icon: string | null }>();
    for (const entry of entries) {
      const name = entry.customFieldName?.trim();
      if (!name) {
        continue;
      }
      const icon = entry.customFieldIcon?.trim() || null;
      const existing = customFieldMetaByName.get(name);
      if (!existing) {
        customFieldMetaByName.set(name, { icon });
      } else if (!existing.icon && icon) {
        existing.icon = icon;
      }
    }

    const maxCustomColumns = 50;
    if (customFieldMetaByName.size > maxCustomColumns) {
      throw new BadRequestException(
        `Слишком много пользовательских колонок (${customFieldMetaByName.size}). Упростите названия или создайте таблицу по одной вкладке (лимит ${maxCustomColumns}).`,
      );
    }

    const columnDefs: Array<{
      id: string;
      title: string;
      type: CustomTableColumnType;
      config?: ColumnDefinitionConfig;
    }> = [
      {
        id: 'date',
        title: 'Дата',
        type: CustomTableColumnType.DATE,
        config: { source: { kind: 'data_entry_field', field: 'date' } },
      },
      ...(dto.scope === DataEntryToCustomTableScope.ALL
        ? [
            {
              id: 'type',
              title: 'Тип',
              type: CustomTableColumnType.TEXT,
              config: { source: { kind: 'data_entry_field', field: 'type' } },
            },
          ]
        : []),
      {
        id: 'amount',
        title: 'Сумма',
        type: CustomTableColumnType.NUMBER,
        config: { source: { kind: 'data_entry_field', field: 'amount' } },
      },
      {
        id: 'currency',
        title: 'Валюта',
        type: CustomTableColumnType.TEXT,
        config: { source: { kind: 'data_entry_field', field: 'currency' } },
      },
      {
        id: 'note',
        title: 'Комментарий',
        type: CustomTableColumnType.TEXT,
        config: { source: { kind: 'data_entry_field', field: 'note' } },
      },
    ];

    const customNames = Array.from(customFieldMetaByName.keys()).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    );
    for (const name of customNames) {
      const meta = customFieldMetaByName.get(name);
      columnDefs.push({
        id: `custom:${name}`,
        title: name,
        type: CustomTableColumnType.TEXT,
        config: {
          ...(meta?.icon ? { icon: meta.icon } : {}),
          source: { kind: 'data_entry_custom_field', name },
        },
      });
    }

    let table: CustomTable;
    try {
      table = await this.customTableRepository.save(
        this.customTableRepository.create({
          userId,
          workspaceId,
          name: tableName,
          description,
          source: CustomTableSource.MANUAL,
          categoryId: null,
          dataEntryScope: dto.scope,
          dataEntryType: selectedType || null,
          dataEntryCustomTabId: null,
          dataEntrySyncedAt: new Date(),
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: table },
      meta: {
        source: 'data_entry_export',
        scope: dto.scope,
        type: selectedType || null,
        rowsPlanned: entries.length,
        customColumns: customNames.length,
      },
    });

    let createdColumns: CustomTableColumn[];
    try {
      createdColumns = await this.customTableColumnRepository.save(
        columnDefs.map((def, position) =>
          this.customTableColumnRepository.create({
            tableId: table.id,
            key: this.generateColumnKey(),
            title: def.title,
            type: def.type,
            isRequired: false,
            isUnique: false,
            position,
            config: def.config ?? null,
          }),
        ),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const keyByDefId = new Map<string, string>();
    for (let i = 0; i < createdColumns.length; i += 1) {
      const def = columnDefs[i];
      const col = createdColumns[i];
      if (def && col) {
        keyByDefId.set(def.id, col.key);
      }
    }

    const customKeyByName = new Map<string, string>();
    for (const name of customNames) {
      const key = keyByDefId.get(`custom:${name}`);
      if (key) {
        customKeyByName.set(name, key);
      }
    }

    const dateKey = keyByDefId.get('date');
    const typeKey = keyByDefId.get('type');
    const amountKey = keyByDefId.get('amount');
    const currencyKey = keyByDefId.get('currency');
    const noteKey = keyByDefId.get('note');

    if (!(dateKey && amountKey && currencyKey && noteKey)) {
      throw new BadRequestException('Не удалось сформировать колонки таблицы');
    }

    const rowsToInsert = entries.map((entry, idx) => {
      const data: RowInsertData = {};
      data[dateKey] = entry.date;
      data[amountKey] = entry.amount;
      data[currencyKey] = entry.currency || 'KZT';
      data[noteKey] = entry.note || null;

      if (dto.scope === DataEntryToCustomTableScope.ALL && typeKey) {
        data[typeKey] = typeLabels[entry.type] || entry.type;
      }

      const customName = entry.customFieldName?.trim();
      const customValue = entry.customFieldValue ?? null;
      if (customName && customValue !== null) {
        const key = customKeyByName.get(customName);
        if (key) {
          data[key] = customValue;
        }
      }

      return this.customTableRowRepository.create({
        tableId: table.id,
        rowNumber: idx + 1,
        data,
      });
    });

    const chunkSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      try {
        await this.customTableRowRepository.save(chunk);
      } catch (error) {
        this.throwHelpfulSchemaError(error);
      }
    }

    await this.logRowBatchCreate({
      userId,
      workspaceId,
      tableId: table.id,
      rows: rowsToInsert,
      meta: {
        rowsCreated: rowsToInsert.length,
        scope: dto.scope,
        type: selectedType || null,
      },
    });

    return {
      tableId: table.id,
      columnsCreated: createdColumns.length,
      rowsCreated: rowsToInsert.length,
    };
  }

  async createFromDataEntryCustomTab(
    userId: string,
    workspaceId: string,
    dto: CreateCustomTableFromDataEntryCustomTabDto,
  ): Promise<{ tableId: string; columnsCreated: number; rowsCreated: number }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    let customTab: DataEntryCustomField | null = null;
    try {
      const qb = this.dataEntryCustomFieldRepository
        .createQueryBuilder('customField')
        .leftJoin('customField.user', 'owner')
        .where('customField.id = :id', { id: dto.customTabId })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId });

      customTab = await qb.getOne();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!customTab) {
      throw new BadRequestException('Пользовательская вкладка не найдена');
    }

    let entries: DataEntry[];
    try {
      const qb = this.dataEntryRepository
        .createQueryBuilder('entry')
        .leftJoin('entry.user', 'owner')
        .where('entry.customTabId = :customTabId', { customTabId: customTab.id })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId })
        .orderBy('entry.date', 'ASC')
        .addOrderBy('entry.createdAt', 'ASC');

      entries = await qb.getMany();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    if (!entries.length) {
      throw new BadRequestException('Нет записей в этой пользовательской вкладке');
    }

    const tableName = (dto.name?.trim() || customTab.name).slice(0, 120);
    const description = dto.description === undefined ? null : dto.description;

    let table: CustomTable;
    try {
      table = await this.customTableRepository.save(
        this.customTableRepository.create({
          userId,
          workspaceId,
          name: tableName,
          description,
          source: CustomTableSource.MANUAL,
          categoryId: null,
          dataEntryScope: null,
          dataEntryType: null,
          dataEntryCustomTabId: customTab.id,
          dataEntrySyncedAt: new Date(),
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: table },
      meta: {
        source: 'data_entry_custom_tab_export',
        customTabId: customTab.id,
        rowsPlanned: entries.length,
      },
    });

    const columnDefs: Array<{
      id: string;
      title: string;
      type: CustomTableColumnType;
      config?: ColumnDefinitionConfig;
    }> = [
      {
        id: 'date',
        title: 'Дата',
        type: CustomTableColumnType.DATE,
        config: {
          source: {
            kind: 'data_entry_custom_tab',
            customTabId: customTab.id,
            field: 'date',
          },
        },
      },
      {
        id: 'amount',
        title: 'Сумма',
        type: CustomTableColumnType.NUMBER,
        config: {
          source: {
            kind: 'data_entry_custom_tab',
            customTabId: customTab.id,
            field: 'amount',
          },
        },
      },
      {
        id: 'currency',
        title: 'Валюта',
        type: CustomTableColumnType.TEXT,
        config: {
          source: {
            kind: 'data_entry_custom_tab',
            customTabId: customTab.id,
            field: 'currency',
          },
        },
      },
      {
        id: 'note',
        title: 'Комментарий',
        type: CustomTableColumnType.TEXT,
        config: {
          source: {
            kind: 'data_entry_custom_tab',
            customTabId: customTab.id,
            field: 'note',
          },
        },
      },
    ];

    let createdColumns: CustomTableColumn[];
    try {
      createdColumns = await this.customTableColumnRepository.save(
        columnDefs.map((def, position) =>
          this.customTableColumnRepository.create({
            tableId: table.id,
            key: this.generateColumnKey(),
            title: def.title,
            type: def.type,
            isRequired: false,
            isUnique: false,
            position,
            config: def.config ?? null,
          }),
        ),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const keyByDefId = new Map<string, string>();
    for (let i = 0; i < createdColumns.length; i += 1) {
      const def = columnDefs[i];
      const col = createdColumns[i];
      if (def && col) {
        keyByDefId.set(def.id, col.key);
      }
    }

    const dateKey = keyByDefId.get('date');
    const amountKey = keyByDefId.get('amount');
    const currencyKey = keyByDefId.get('currency');
    const noteKey = keyByDefId.get('note');

    if (!(dateKey && amountKey && currencyKey && noteKey)) {
      throw new BadRequestException('Не удалось сформировать колонки таблицы');
    }

    const rowsToInsert = entries.map((entry, idx) => {
      const data: RowInsertData = {};
      data[dateKey] = entry.date;
      data[amountKey] = entry.amount;
      data[currencyKey] = entry.currency || 'KZT';
      data[noteKey] = entry.note || null;
      return this.customTableRowRepository.create({
        tableId: table.id,
        rowNumber: idx + 1,
        data,
      });
    });

    const chunkSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      try {
        await this.customTableRowRepository.save(chunk);
      } catch (error) {
        this.throwHelpfulSchemaError(error);
      }
    }

    await this.logRowBatchCreate({
      userId,
      workspaceId,
      tableId: table.id,
      rows: rowsToInsert,
      meta: {
        rowsCreated: rowsToInsert.length,
        source: 'data_entry_custom_tab_export',
        customTabId: customTab.id,
      },
    });

    return {
      tableId: table.id,
      columnsCreated: createdColumns.length,
      rowsCreated: rowsToInsert.length,
    };
  }

  async syncFromDataEntry(
    userId: string,
    workspaceId: string,
    tableId: string,
  ): Promise<{ tableId: string; rowsCreated: number; syncedAt: Date }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    let table: CustomTable | null = null;
    try {
      const qb = this.customTableRepository
        .createQueryBuilder('table')
        .leftJoinAndSelect('table.columns', 'columns')
        .leftJoin('table.user', 'owner')
        .where('table.id = :tableId', { tableId })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId });

      table = await qb.getOne();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!table) {
      throw new NotFoundException('Таблица не найдена');
    }

    const isCustomTab = Boolean(table.dataEntryCustomTabId);
    if (!(isCustomTab || table.dataEntryScope)) {
      throw new BadRequestException('Таблица не связана с вводом данных');
    }

    let entries: DataEntry[];
    try {
      const qb = this.dataEntryRepository
        .createQueryBuilder('entry')
        .leftJoin('entry.user', 'owner')
        .where('owner.workspaceId = :workspaceId', { workspaceId })
        .orderBy('entry.date', 'ASC')
        .addOrderBy('entry.createdAt', 'ASC');

      if (isCustomTab) {
        qb.andWhere('entry.customTabId = :customTabId', {
          customTabId: table.dataEntryCustomTabId,
        });
      } else if (table.dataEntryScope === DataEntryToCustomTableScope.TYPE) {
        if (!table.dataEntryType) {
          throw new BadRequestException('Не указан тип для синхронизации');
        }
        qb.andWhere('entry.type = :type', { type: table.dataEntryType });
      }

      entries = await qb.getMany();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const columns = (table.columns || []).sort((a, b) => a.position - b.position);
    const { fieldKeyByName, customFieldKeyByName } = this.getDataEntryColumnMapping(columns);

    const requiredFields: DataEntryFieldKey[] = ['date', 'amount', 'currency', 'note'];
    if (!isCustomTab && table.dataEntryScope === DataEntryToCustomTableScope.ALL) {
      requiredFields.push('type');
    }

    const missing = requiredFields.filter(field => !fieldKeyByName[field]);
    if (missing.length) {
      const labelByField: Record<DataEntryFieldKey, string> = {
        date: 'Дата',
        type: 'Тип',
        amount: 'Сумма',
        currency: 'Валюта',
        note: 'Комментарий',
      };
      const missingLabels = missing.map(field => labelByField[field]).join(', ');
      throw new BadRequestException(`Не найдены колонки для синхронизации: ${missingLabels}`);
    }

    const typeLabels: Record<DataEntryType, string> = {
      [DataEntryType.CASH]: 'Наличные',
      [DataEntryType.RAW]: 'Сырьё',
      [DataEntryType.DEBIT]: 'Дебет',
      [DataEntryType.CREDIT]: 'Кредит',
    };

    const rowsToInsert = entries.map((entry, idx) => {
      const data: RowInsertData = {};
      const dateKey = fieldKeyByName.date;
      const amountKey = fieldKeyByName.amount;
      const currencyKey = fieldKeyByName.currency;
      const noteKey = fieldKeyByName.note;
      const typeKey = fieldKeyByName.type;

      if (dateKey) {
        data[dateKey] = entry.date;
      }
      if (amountKey) {
        data[amountKey] = entry.amount;
      }
      if (currencyKey) {
        data[currencyKey] = entry.currency || 'KZT';
      }
      if (noteKey) {
        data[noteKey] = entry.note || null;
      }

      if (!isCustomTab && table.dataEntryScope === DataEntryToCustomTableScope.ALL && typeKey) {
        data[typeKey] = typeLabels[entry.type] || entry.type;
      }

      const customName = entry.customFieldName?.trim();
      if (customName) {
        const customKey = customFieldKeyByName.get(customName);
        if (customKey) {
          data[customKey] = entry.customFieldValue ?? null;
        }
      }

      return {
        tableId: table.id,
        rowNumber: idx + 1,
        data,
      };
    });

    const syncedAt = new Date();
    const createdRows: CustomTableRow[] = [];
    await this.customTableRepository.manager.transaction(async manager => {
      await manager.delete(CustomTableRow, { tableId: table.id });
      const chunkSize = 500;
      for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        const chunk = rowsToInsert.slice(i, i + chunkSize);
        if (chunk.length) {
          const savedChunk = await manager.save(CustomTableRow, chunk);
          createdRows.push(...savedChunk);
        }
      }
      await manager.update(CustomTable, { id: table.id }, { dataEntrySyncedAt: syncedAt });
    });

    await this.logRowBatchCreate({
      userId,
      workspaceId,
      tableId: table.id,
      rows: createdRows,
      meta: {
        rowsCreated: rowsToInsert.length,
        source: 'data_entry_sync',
      },
    });

    return { tableId: table.id, rowsCreated: rowsToInsert.length, syncedAt };
  }

  async createFromStatements(
    userId: string,
    workspaceId: string,
    dto: CreateCustomTableFromStatementsDto,
  ): Promise<{ tableId: string; columnsCreated: number; rowsCreated: number }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const statementIds = Array.from(
      new Set((dto.statementIds || []).map(v => String(v).trim()).filter(Boolean)),
    );
    if (!statementIds.length) {
      throw new BadRequestException('Выберите выписку');
    }
    if (statementIds.length > 10) {
      throw new BadRequestException('Слишком много выписок (лимит 10)');
    }

    let statements: Statement[];
    try {
      const qb = this.statementRepository
        .createQueryBuilder('statement')
        .leftJoin('statement.user', 'owner')
        .where('statement.id IN (:...ids)', { ids: statementIds })
        .andWhere('owner.workspaceId = :workspaceId', { workspaceId })
        .orderBy('statement.createdAt', 'DESC');

      statements = await qb.getMany();
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (statements.length !== statementIds.length) {
      throw new BadRequestException('Выписка не найдена');
    }

    let transactions: Transaction[];
    try {
      transactions = await this.transactionRepository.find({
        where: { statementId: In(statementIds) },
        order: { transactionDate: 'ASC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!transactions.length) {
      throw new BadRequestException('В выбранной выписке нет транзакций');
    }

    const defaultName =
      statements.length === 1
        ? `Выписка — ${statements[0]?.fileName || 'без названия'}`
        : `Выписки (${statements.length})`;
    const tableName = (dto.name?.trim() || defaultName).slice(0, 120);
    const description = dto.description === undefined ? null : dto.description;

    const includeStatementCol = statements.length > 1;

    const columnDefs: Array<{
      id: string;
      title: string;
      type: CustomTableColumnType;
    }> = [
      ...(includeStatementCol
        ? [
            {
              id: 'statement',
              title: 'Выписка',
              type: CustomTableColumnType.TEXT,
            },
          ]
        : []),
      { id: 'date', title: 'Дата', type: CustomTableColumnType.DATE },
      {
        id: 'counterparty',
        title: 'Контрагент',
        type: CustomTableColumnType.TEXT,
      },
      { id: 'purpose', title: 'Назначение', type: CustomTableColumnType.TEXT },
      { id: 'debit', title: 'Дебет', type: CustomTableColumnType.NUMBER },
      { id: 'credit', title: 'Кредит', type: CustomTableColumnType.NUMBER },
      { id: 'currency', title: 'Валюта', type: CustomTableColumnType.TEXT },
      { id: 'type', title: 'Тип', type: CustomTableColumnType.TEXT },
    ];

    let table: CustomTable;
    try {
      table = await this.customTableRepository.save(
        this.customTableRepository.create({
          userId,
          workspaceId,
          name: tableName,
          description,
          source: CustomTableSource.MANUAL,
          categoryId: null,
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: table },
      meta: {
        source: 'statement_export',
        statementIds,
        rowsPlanned: transactions.length,
      },
    });

    let createdColumns: CustomTableColumn[];
    try {
      createdColumns = await this.customTableColumnRepository.save(
        columnDefs.map((def, position) =>
          this.customTableColumnRepository.create({
            tableId: table.id,
            key: this.generateColumnKey(),
            title: def.title,
            type: def.type,
            isRequired: false,
            isUnique: false,
            position,
            config: null,
          }),
        ),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const keyByDefId = new Map<string, string>();
    for (let i = 0; i < createdColumns.length; i += 1) {
      const def = columnDefs[i];
      const col = createdColumns[i];
      if (def && col) {
        keyByDefId.set(def.id, col.key);
      }
    }

    const statementKey = keyByDefId.get('statement');
    const dateKey = keyByDefId.get('date');
    const counterpartyKey = keyByDefId.get('counterparty');
    const purposeKey = keyByDefId.get('purpose');
    const debitKey = keyByDefId.get('debit');
    const creditKey = keyByDefId.get('credit');
    const currencyKey = keyByDefId.get('currency');
    const typeKey = keyByDefId.get('type');

    if (
      !(dateKey && counterpartyKey && purposeKey && debitKey && creditKey && currencyKey && typeKey)
    ) {
      throw new BadRequestException('Не удалось сформировать колонки таблицы');
    }

    const statementNameById = new Map<string, string>();
    for (const s of statements) {
      statementNameById.set(s.id, s.fileName);
    }

    const typeLabel: Record<string, string> = {
      [TransactionType.INCOME]: 'Поступление',
      [TransactionType.EXPENSE]: 'Списание',
    };

    const rowsToInsert = transactions.map((tx, idx) => {
      const data: RowInsertData = {};

      if (includeStatementCol && statementKey) {
        data[statementKey] = statementNameById.get(tx.statementId) || tx.statementId;
      }

      const date =
        tx.transactionDate instanceof Date
          ? tx.transactionDate.toISOString().slice(0, 10)
          : String(tx.transactionDate ?? '').slice(0, 10);
      data[dateKey] = date;
      data[counterpartyKey] = tx.counterpartyName || '';
      data[purposeKey] = tx.paymentPurpose || '';

      const asNumberOrNull = (value: unknown) => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : null;
      };

      data[debitKey] = asNumberOrNull(tx.debit);
      data[creditKey] = asNumberOrNull(tx.credit);
      data[currencyKey] = tx.currency || 'KZT';
      data[typeKey] = typeLabel[tx.transactionType] || tx.transactionType;

      return this.customTableRowRepository.create({
        tableId: table.id,
        rowNumber: idx + 1,
        data,
      });
    });

    const chunkSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      try {
        await this.customTableRowRepository.save(chunk);
      } catch (error) {
        this.throwHelpfulSchemaError(error);
      }
    }

    await this.logRowBatchCreate({
      userId,
      workspaceId,
      tableId: table.id,
      rows: rowsToInsert,
      meta: {
        rowsCreated: rowsToInsert.length,
        source: 'statement_export',
        statementIds,
      },
    });

    return {
      tableId: table.id,
      columnsCreated: createdColumns.length,
      rowsCreated: rowsToInsert.length,
    };
  }

  async convertToStatement(
    userId: string,
    workspaceId: string,
    tableId: string,
  ): Promise<{
    statementId: string;
    importedRows: number;
    skippedRows: number;
    warnings: string[];
  }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.ensureCanEditStatements(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);

    let columns: CustomTableColumn[];
    let rows: CustomTableRow[];
    try {
      [columns, rows] = await Promise.all([
        this.customTableColumnRepository.find({
          where: { tableId },
          order: { position: 'ASC' },
        }),
        this.customTableRowRepository.find({
          where: { tableId },
          order: { rowNumber: 'ASC' },
        }),
      ]);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    if (!columns.length) {
      throw new BadRequestException('В таблице нет колонок для конвертации');
    }
    if (!rows.length) {
      throw new BadRequestException('В таблице нет строк для конвертации');
    }

    const mapping = this.buildConversionMapping(columns);
    const missingRequired = [
      !mapping.date ? 'date' : null,
      !mapping.amount ? 'amount' : null,
    ].filter((value): value is string => Boolean(value));

    if (missingRequired.length) {
      throw new BadRequestException(
        `Не удалось определить обязательные колонки: ${missingRequired.join(', ')}`,
      );
    }

    const converted: ConvertedTransactionInput[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
      const data = this.toRowDataRecord(row.data);
      const transactionDate = this.parseConversionDate(
        mapping.date ? this.getRowDataValue(data, mapping.date) : null,
      );
      const amount = this.parsePositiveAmount(
        mapping.amount ? this.getRowDataValue(data, mapping.amount) : null,
      );

      if (!transactionDate) {
        warnings.push(`row ${row.rowNumber} skipped: invalid date`);
        continue;
      }
      if (!amount) {
        warnings.push(`row ${row.rowNumber} skipped: invalid amount`);
        continue;
      }

      const merchant = this.readScalarString(data, mapping.merchant) || table.name;
      const purpose = this.readScalarString(data, mapping.purpose) || merchant;
      const currency = (this.readScalarString(data, mapping.currency) || 'KZT')
        .trim()
        .toUpperCase();
      const article = this.readScalarString(data, mapping.article) || null;

      converted.push({
        rowNumber: row.rowNumber,
        transactionDate,
        merchant,
        purpose,
        amount,
        currency,
        article,
      });
    }

    if (!converted.length) {
      throw new BadRequestException('В таблице нет валидных строк для конвертации');
    }

    const existingStatement = await this.findConvertedStatement(workspaceId, tableId);
    const csv = this.buildConvertedCsv(converted);
    const fileName = normalizeFilename(`${table.name}-expenses.csv`);
    const filePath =
      existingStatement?.filePath || path.join(resolveUploadsDir(), `${randomUUID()}.csv`);
    await fs.promises.writeFile(filePath, csv);

    const statementDateFrom = new Date(
      Math.min(...converted.map(row => row.transactionDate.getTime())),
    );
    const statementDateTo = new Date(
      Math.max(...converted.map(row => row.transactionDate.getTime())),
    );
    const totalDebit = converted.reduce((sum, row) => sum + row.amount, 0);
    const currency = converted[0]?.currency || 'KZT';
    const fileHash = createHash('sha256').update(csv).digest('hex');

    const statementPayload: Partial<Statement> = {
      userId,
      workspaceId,
      fileName,
      filePath,
      fileType: FileType.CSV,
      fileSize: csv.length,
      fileHash,
      bankName: BankName.OTHER,
      status: StatementStatus.COMPLETED,
      processedAt: new Date(),
      statementDateFrom,
      statementDateTo,
      totalTransactions: converted.length,
      totalDebit,
      totalCredit: 0,
      currency,
      categoryId: table.categoryId ?? null,
      deletedAt: null,
      parsingDetails: {
        detectedBy: 'custom-table-conversion',
        parserUsed: 'custom-table-conversion',
        parserVersion: '1',
        transactionsFound: rows.length,
        transactionsCreated: converted.length,
        warnings,
        metadataExtracted: {
          dateFrom: this.toDateOnly(statementDateFrom),
          dateTo: this.toDateOnly(statementDateTo),
          currency,
        },
        importPreview: {
          source: 'custom-table-conversion',
          customTableId: table.id,
          tableName: table.name,
          rowsImported: converted.length,
          rowsSkipped: rows.length - converted.length,
        },
      },
    };

    const beforeStatement = existingStatement ? { ...existingStatement } : null;
    const statement = existingStatement
      ? Object.assign(existingStatement, statementPayload)
      : this.statementRepository.create(statementPayload);
    const savedStatement = await this.statementRepository.save(statement);

    try {
      await this.statementRepository.update(savedStatement.id, { fileData: csv });
    } catch (error) {
      this.logger.warn(
        `Failed to persist converted table file in DB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (existingStatement) {
      await this.transactionRepository.delete({ statementId: savedStatement.id });
    }

    const transactions = converted.map(row =>
      this.transactionRepository.create({
        workspaceId,
        statementId: savedStatement.id,
        transactionDate: new Date(this.toDateOnly(row.transactionDate)),
        counterpartyName: row.merchant,
        paymentPurpose: row.purpose,
        debit: row.amount,
        credit: null,
        amount: row.amount,
        currency: row.currency,
        article: row.article,
        transactionType: TransactionType.EXPENSE,
        categoryId: table.categoryId ?? null,
        isVerified: true,
        fingerprint: generateTransactionFingerprint({
          workspaceId,
          accountNumber: '',
          date: row.transactionDate,
          amount: row.amount,
          currency: row.currency,
          direction: 'debit',
          merchant: row.merchant,
        }),
      }),
    );

    await this.transactionRepository.save(transactions);

    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.STATEMENT,
      entityId: savedStatement.id,
      action: AuditAction.IMPORT,
      diff: { before: beforeStatement, after: savedStatement },
      meta: {
        source: 'custom-table-conversion',
        customTableId: table.id,
        rowsImported: converted.length,
        rowsSkipped: rows.length - converted.length,
      },
      isUndoable: false,
    });

    return {
      statementId: savedStatement.id,
      importedRows: converted.length,
      skippedRows: rows.length - converted.length,
      warnings,
    };
  }

  async removeTable(userId: string, workspaceId: string, tableId: string): Promise<void> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);
    try {
      await this.customTableRepository.delete({ id: table.id });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.DELETE,
      diff: { before: table, after: null },
      isUndoable: true,
    });
  }

  /**
   * Формула проверяется при сохранении колонки: здесь ошибку надо показать,
   * в отличие от вычисления строк, где сбой даёт пустую ячейку.
   */
  private async validateFormulaConfig(
    tableId: string,
    type: CustomTableColumnType | undefined,
    config: Record<string, unknown> | null | undefined,
    selfColumnKey: string | null,
  ): Promise<void> {
    if (type !== CustomTableColumnType.FORMULA) {
      return;
    }
    const expression = config?.expression;
    if (typeof expression !== 'string' || !expression.trim()) {
      throw new BadRequestException('Для формульной колонки нужна формула');
    }
    const columns = await this.customTableColumnRepository.find({
      where: { tableId },
      select: ['key', 'type'],
    });
    // Ссылка колонки на саму себя дала бы бесконечную зависимость.
    const knownKeys = columns
      .filter(col => col.key !== selfColumnKey && col.type !== CustomTableColumnType.FORMULA)
      .map(col => col.key);
    try {
      assertValidFormula(expression, knownKeys);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Некорректная формула',
      );
    }
  }

  async addColumn(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: CreateCustomTableColumnDto,
  ): Promise<CustomTableColumn> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);

    await this.validateFormulaConfig(tableId, dto.type, dto.config, null);
    await this.validateRelationConfig(workspaceId, dto.type, dto.config);

    const position = dto.position ?? (await this.getNextColumnPosition(tableId));
    const column = this.customTableColumnRepository.create({
      tableId,
      key: this.generateColumnKey(),
      title: dto.title,
      type: dto.type ?? CustomTableColumnType.TEXT,
      isRequired: dto.isRequired ?? false,
      isUnique: dto.isUnique ?? false,
      position,
      config: dto.config ?? null,
    });

    let saved: CustomTableColumn;
    try {
      saved = await this.customTableColumnRepository.save(column);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE_COLUMN,
      entityId: saved.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: saved },
      meta: {
        tableId,
        key: saved.key,
      },
    });
    return saved;
  }

  async updateColumn(
    userId: string,
    workspaceId: string,
    tableId: string,
    columnId: string,
    dto: UpdateCustomTableColumnDto,
  ): Promise<CustomTableColumn> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    if (!this.isUuid(columnId)) {
      throw new BadRequestException('Некорректный идентификатор колонки');
    }
    let column: CustomTableColumn | null = null;
    try {
      column = await this.customTableColumnRepository.findOne({
        where: { id: columnId, tableId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!column) {
      throw new NotFoundException('Колонка не найдена');
    }

    const before = { ...column };
    if (dto.title !== undefined) {
      column.title = dto.title;
    }
    if (dto.type !== undefined) {
      column.type = dto.type;
    }
    if (dto.isRequired !== undefined) {
      column.isRequired = dto.isRequired;
    }
    if (dto.isUnique !== undefined) {
      column.isUnique = dto.isUnique;
    }
    if (dto.position !== undefined) {
      column.position = dto.position;
    }
    if (dto.config !== undefined) {
      column.config = dto.config ?? null;
    }

    await this.validateFormulaConfig(tableId, column.type, column.config, column.key);
    await this.validateRelationConfig(workspaceId, column.type, column.config);

    let saved: CustomTableColumn;
    try {
      saved = await this.customTableColumnRepository.save(column);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE_COLUMN,
      entityId: columnId,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: { tableId },
    });
    return saved;
  }

  async reorderColumns(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: ReorderCustomTableColumnsDto,
  ): Promise<void> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    const invalidId = dto.columnIds.find(id => !this.isUuid(id));
    if (invalidId) {
      throw new BadRequestException('Некорректный идентификатор колонки');
    }
    let columns: CustomTableColumn[] = [];
    try {
      columns = await this.customTableColumnRepository.find({
        where: { tableId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    const beforePositions = new Map(columns.map(col => [col.id, col.position ?? 0]));
    const existingIds = new Set(columns.map(c => c.id));
    for (const id of dto.columnIds) {
      if (!existingIds.has(id)) {
        throw new NotFoundException('Одна из колонок не найдена');
      }
    }

    const updates = dto.columnIds.map((id, idx) => ({
      id,
      tableId,
      position: idx,
    }));
    try {
      await this.customTableColumnRepository.save(updates);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    try {
      await this.auditService.createBatchEvents(
        dto.columnIds.map((id, idx) => ({
          workspaceId,
          actorType: ActorType.USER,
          actorId: userId,
          entityType: EntityType.CUSTOM_TABLE_COLUMN,
          entityId: id,
          action: AuditAction.UPDATE,
          diff: {
            before: { position: beforePositions.get(id) ?? null },
            after: { position: idx },
          },
          meta: { tableId, reorder: true },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Audit event write failed for column reorder: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async removeColumn(
    userId: string,
    workspaceId: string,
    tableId: string,
    columnId: string,
  ): Promise<void> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    if (!this.isUuid(columnId)) {
      throw new BadRequestException('Некорректный идентификатор колонки');
    }
    let column: CustomTableColumn | null = null;
    try {
      column = await this.customTableColumnRepository.findOne({
        where: { id: columnId, tableId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!column) {
      throw new NotFoundException('Колонка не найдена');
    }
    try {
      await this.customTableColumnRepository.delete({ id: columnId, tableId });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE_COLUMN,
      entityId: columnId,
      action: AuditAction.DELETE,
      diff: { before: column, after: null },
      meta: { tableId, key: column.key },
      isUndoable: true,
    });
  }

  /**
   * Значения строк лежат в jsonb как текст, поэтому сравнение по типу колонки
   * требует приведения. Выражения общие для фильтрации и сортировки — иначе
   * фильтр и сортировка по одной колонке трактуют её по-разному.
   */
  private buildTypedValueExprs(colParam: string): {
    textExpr: string;
    textCoalescedExpr: string;
    numericExpr: string;
    dateExpr: string;
    boolExpr: string;
  } {
    const textExpr = `r.data ->> :${colParam}`;
    return {
      textExpr,
      textCoalescedExpr: `COALESCE(${textExpr}, '')`,
      numericExpr: `(CASE WHEN ${textExpr} ~ '^\\s*-?\\d+(?:\\.\\d+)?\\s*$' THEN (${textExpr})::numeric ELSE NULL END)`,
      dateExpr: `(CASE
          WHEN ${textExpr} ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (${textExpr})::date
          WHEN ${textExpr} ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN to_date(${textExpr}, 'DD.MM.YYYY')
          ELSE NULL
        END)`,
      boolExpr: `(CASE
          WHEN lower(${textExpr}) IN ('true','t','1','yes','y') THEN true
          WHEN lower(${textExpr}) IN ('false','f','0','no','n') THEN false
          ELSE NULL
        END)`,
    };
  }

  private sortExprForColumnType(colParam: string, columnType: CustomTableColumnType): string {
    const exprs = this.buildTypedValueExprs(colParam);
    switch (columnType) {
      case CustomTableColumnType.NUMBER:
      case CustomTableColumnType.CURRENCY:
        return exprs.numericExpr;
      case CustomTableColumnType.DATE:
        return exprs.dateExpr;
      case CustomTableColumnType.BOOLEAN:
        return exprs.boolExpr;
      default:
        return exprs.textExpr;
    }
  }

  /**
   * Значения формульных колонок не хранятся — считаются при выдаче.
   * Из-за этого они одинаковы в гриде и в выгрузке, но по ним нельзя
   * фильтровать, сортировать и агрегировать: в jsonb их нет.
   */
  private applyFormulaColumns(rows: CustomTableRow[], columns: CustomTableColumn[]): void {
    const formulaColumns = columns.filter(
      col =>
        col.type === CustomTableColumnType.FORMULA && typeof col.config?.expression === 'string',
    );
    if (!formulaColumns.length) {
      return;
    }
    for (const row of rows) {
      const data = (row.data ?? {}) as Record<string, unknown>;
      for (const col of formulaColumns) {
        data[col.key] = evaluateFormula(col.config?.expression as string, data);
      }
      row.data = data;
    }
  }

  /**
   * Подписи связанных строк. Как и формулы, считаются при выдаче и не
   * хранятся: иначе переименование строки-цели оставило бы всюду устаревший
   * текст. В data[key] лежит идентификатор строки, подпись едет отдельно.
   */
  private async applyRelationLabels(
    rows: CustomTableRow[],
    columns: CustomTableColumn[],
  ): Promise<void> {
    const relationColumns = columns.filter(
      col =>
        col.type === CustomTableColumnType.RELATION &&
        typeof col.config?.targetTableId === 'string',
    );
    if (!(relationColumns.length && rows.length)) {
      return;
    }

    for (const col of relationColumns) {
      const targetTableId = col.config?.targetTableId as string;
      const displayKey = col.config?.displayColumnKey as string | undefined;

      const ids = Array.from(
        new Set(
          rows
            .map(row => (row.data as Record<string, unknown>)?.[col.key])
            .filter((v): v is string => typeof v === 'string' && this.isUuid(v)),
        ),
      );
      if (!ids.length) {
        continue;
      }

      const targetRows = await this.customTableRowRepository.find({
        where: { id: In(ids), tableId: targetTableId },
        select: ['id', 'rowNumber', 'data'],
      });
      const labelById = new Map(
        targetRows.map(target => {
          const raw = displayKey
            ? (target.data as Record<string, unknown>)?.[displayKey]
            : undefined;
          const label =
            raw === null || raw === undefined || String(raw).trim() === ''
              ? `#${target.rowNumber}`
              : String(raw);
          return [target.id, label];
        }),
      );

      for (const row of rows) {
        const value = (row.data as Record<string, unknown>)?.[col.key];
        if (typeof value !== 'string') {
          continue;
        }
        const labels =
          (row as CustomTableRow & { relationLabels?: Record<string, string> }).relationLabels ??
          {};
        // Ссылка на удалённую строку остаётся видимой как «висячая».
        labels[col.key] = labelById.get(value) ?? '—';
        (row as CustomTableRow & { relationLabels?: Record<string, string> }).relationLabels =
          labels;
      }
    }
  }

  /** Проверка настроек связи: цель обязана быть в том же воркспейсе. */
  private async validateRelationConfig(
    workspaceId: string,
    type: CustomTableColumnType | undefined,
    config: Record<string, unknown> | null | undefined,
  ): Promise<void> {
    if (type !== CustomTableColumnType.RELATION) {
      return;
    }
    const targetTableId = config?.targetTableId;
    if (typeof targetTableId !== 'string' || !this.isUuid(targetTableId)) {
      throw new BadRequestException('Для колонки-связи нужна таблица-цель');
    }
    // requireTable проверяет принадлежность воркспейсу — это и есть защита
    // от ссылки на чужие данные.
    await this.requireTable(workspaceId, targetTableId);

    const displayColumnKey = config?.displayColumnKey;
    if (displayColumnKey !== undefined && displayColumnKey !== null) {
      if (typeof displayColumnKey !== 'string') {
        throw new BadRequestException('Некорректная колонка для подписи');
      }
      const targetColumns = await this.loadColumnTypeMap(targetTableId);
      if (!targetColumns.has(displayColumnKey)) {
        throw new BadRequestException(`Колонка подписи не найдена: ${displayColumnKey}`);
      }
    }
  }

  /** Варианты для выбора связанной строки. */
  async listRelationOptions(
    workspaceId: string,
    tableId: string,
    columnKey: string,
    search?: string,
  ): Promise<{ items: Array<{ id: string; label: string }> }> {
    await this.requireTable(workspaceId, tableId);
    const column = await this.customTableColumnRepository.findOne({
      where: { tableId, key: columnKey },
    });
    if (!column || column.type !== CustomTableColumnType.RELATION) {
      throw new BadRequestException('Колонка не является связью');
    }
    const targetTableId = column.config?.targetTableId as string | undefined;
    if (!targetTableId) {
      throw new BadRequestException('У колонки-связи нет таблицы-цели');
    }
    await this.requireTable(workspaceId, targetTableId);

    const displayKey = column.config?.displayColumnKey as string | undefined;
    const query = this.customTableRowRepository
      .createQueryBuilder('r')
      .where('r.tableId = :targetTableId', { targetTableId })
      .orderBy('r.rowNumber', 'ASC')
      .take(200);
    if (search?.trim()) {
      query.andWhere('r.data::text ILIKE :search', { search: `%${search.trim()}%` });
    }
    const rows = await query.getMany();

    return {
      items: rows.map(row => {
        const raw = displayKey ? (row.data as Record<string, unknown>)?.[displayKey] : undefined;
        const label =
          raw === null || raw === undefined || String(raw).trim() === ''
            ? `#${row.rowNumber}`
            : String(raw);
        return { id: row.id, label };
      }),
    };
  }

  private async loadColumnsWithConfig(tableId: string): Promise<CustomTableColumn[]> {
    return this.customTableColumnRepository.find({
      where: { tableId },
      order: { position: 'ASC' },
    });
  }

  private async loadColumnTypeMap(tableId: string): Promise<Map<string, CustomTableColumnType>> {
    const columns = await this.customTableColumnRepository.find({
      where: { tableId },
      select: ['key', 'type'],
    });
    return new Map<string, CustomTableColumnType>(columns.map(c => [c.key, c.type]));
  }

  private applyRowFilters(
    query: SelectQueryBuilder<CustomTableRow>,
    rawFilters: CustomTableRowFilterDto[],
    typeByKey: Map<string, CustomTableColumnType>,
  ): void {
    if (rawFilters.length) {
      if (rawFilters.length > 50) {
        throw new BadRequestException('Слишком много фильтров');
      }

      rawFilters.forEach((filter, index) => {
        const op = filter?.op;
        if (!op) {
          throw new BadRequestException('Некорректный фильтр');
        }

        if (op === 'search') {
          const rawValue =
            typeof filter.value === 'string'
              ? filter.value.trim()
              : String(filter.value ?? '').trim();
          if (!rawValue) {
            return;
          }
          const valueParam = `f_val_${index}`;
          query.andWhere(`r.data::text ILIKE :${valueParam}`, {
            [valueParam]: `%${rawValue}%`,
          });
          return;
        }

        const col = filter?.col?.trim();
        if (!col) {
          throw new BadRequestException('Некорректный фильтр');
        }
        const columnType = typeByKey.get(col);
        if (!columnType) {
          throw new BadRequestException(`Колонка для фильтра не найдена: ${col}`);
        }

        const colParam = `f_col_${index}`;
        const valueParam = `f_val_${index}`;
        const valueParam2 = `f_val2_${index}`;
        const valuesParam = `f_vals_${index}`;

        const { textExpr, textCoalescedExpr, numericExpr, dateExpr, boolExpr } =
          this.buildTypedValueExprs(colParam);

        const apply = (sql: string, paramsObj: QueryParams) => {
          query.andWhere(sql, paramsObj);
        };

        const withCol = (paramsObj: QueryParams): QueryParams => ({
          ...paramsObj,
          [colParam]: col,
        });

        switch (op) {
          case 'isEmpty': {
            if (columnType === CustomTableColumnType.MULTI_SELECT) {
              apply(
                `(r.data -> :${colParam} IS NULL OR r.data -> :${colParam} = '[]'::jsonb)`,
                withCol({}),
              );
              break;
            }
            apply(`(${textExpr} IS NULL OR ${textExpr} = '')`, withCol({}));
            break;
          }
          case 'isNotEmpty': {
            if (columnType === CustomTableColumnType.MULTI_SELECT) {
              apply(
                `(r.data -> :${colParam} IS NOT NULL AND r.data -> :${colParam} <> '[]'::jsonb)`,
                withCol({}),
              );
              break;
            }
            apply(`(${textExpr} IS NOT NULL AND ${textExpr} <> '')`, withCol({}));
            break;
          }
          case 'contains': {
            const value =
              typeof filter.value === 'string'
                ? filter.value.trim()
                : String(filter.value ?? '').trim();
            if (!value) {
              return;
            }
            apply(
              `${textCoalescedExpr} ILIKE :${valueParam}`,
              withCol({ [valueParam]: `%${value}%` }),
            );
            break;
          }
          case 'startsWith': {
            const value =
              typeof filter.value === 'string'
                ? filter.value.trim()
                : String(filter.value ?? '').trim();
            if (!value) {
              return;
            }
            apply(
              `${textCoalescedExpr} ILIKE :${valueParam}`,
              withCol({ [valueParam]: `${value}%` }),
            );
            break;
          }
          case 'eq':
          case 'neq': {
            const isNeq = op === 'neq';
            if (isNumericColumnType(columnType)) {
              const value = Number(filter.value);
              if (!Number.isFinite(value)) {
                return;
              }
              apply(
                `${numericExpr} ${isNeq ? 'IS DISTINCT FROM' : '='} :${valueParam}`,
                withCol({ [valueParam]: value }),
              );
              break;
            }
            if (columnType === CustomTableColumnType.DATE) {
              const value =
                typeof filter.value === 'string'
                  ? filter.value.trim()
                  : String(filter.value ?? '').trim();
              if (!value) {
                return;
              }
              apply(
                `${dateExpr} ${isNeq ? 'IS DISTINCT FROM' : '='} :${valueParam}`,
                withCol({ [valueParam]: value }),
              );
              break;
            }
            if (columnType === CustomTableColumnType.BOOLEAN) {
              const raw =
                typeof filter.value === 'boolean'
                  ? filter.value
                  : String(filter.value ?? '').trim();
              if (raw === '') {
                return;
              }
              const value =
                typeof raw === 'boolean'
                  ? raw
                  : ['true', '1', 'yes', 'y', 't'].includes(raw.toLowerCase());
              apply(
                `${boolExpr} ${isNeq ? 'IS DISTINCT FROM' : '='} :${valueParam}`,
                withCol({ [valueParam]: value }),
              );
              break;
            }
            if (columnType === CustomTableColumnType.MULTI_SELECT) {
              const value =
                typeof filter.value === 'string'
                  ? filter.value.trim()
                  : String(filter.value ?? '').trim();
              if (!value) {
                return;
              }
              apply(
                `(CASE WHEN jsonb_typeof(r.data -> :${colParam}) = 'array'
                  THEN ${isNeq ? 'NOT ' : ''}EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(r.data -> :${colParam}) AS elem
                    WHERE elem = :${valueParam}
                  )
                  ELSE ${isNeq ? 'true' : 'false'} END)`,
                withCol({ [valueParam]: value }),
              );
              break;
            }
            {
              const value =
                typeof filter.value === 'string'
                  ? filter.value.trim()
                  : String(filter.value ?? '').trim();
              if (!value && value !== '') {
                return;
              }
              apply(
                `${textExpr} ${isNeq ? 'IS DISTINCT FROM' : '='} :${valueParam}`,
                withCol({ [valueParam]: value }),
              );
              break;
            }
          }
          case 'gt':
          case 'gte':
          case 'lt':
          case 'lte': {
            const cmp = op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : '<=';
            if (isNumericColumnType(columnType)) {
              const value = Number(filter.value);
              if (!Number.isFinite(value)) {
                return;
              }
              apply(`${numericExpr} ${cmp} :${valueParam}`, withCol({ [valueParam]: value }));
              break;
            }
            if (columnType === CustomTableColumnType.DATE) {
              const value =
                typeof filter.value === 'string'
                  ? filter.value.trim()
                  : String(filter.value ?? '').trim();
              if (!value) {
                return;
              }
              apply(`${dateExpr} ${cmp} :${valueParam}`, withCol({ [valueParam]: value }));
              break;
            }
            throw new BadRequestException(
              `Оператор ${op} не поддерживается для типа ${columnType}`,
            );
          }
          case 'between': {
            const value = filter.value;
            const arr = Array.isArray(value) ? value : undefined;
            if (!arr || arr.length < 2) {
              return;
            }
            const [rawMin, rawMax] = arr;
            if (isNumericColumnType(columnType)) {
              const min = Number(rawMin);
              const max = Number(rawMax);
              if (!(Number.isFinite(min) && Number.isFinite(max))) {
                return;
              }
              apply(
                `${numericExpr} BETWEEN :${valueParam} AND :${valueParam2}`,
                withCol({ [valueParam]: min, [valueParam2]: max }),
              );
              break;
            }
            if (columnType === CustomTableColumnType.DATE) {
              const min = typeof rawMin === 'string' ? rawMin.trim() : String(rawMin ?? '').trim();
              const max = typeof rawMax === 'string' ? rawMax.trim() : String(rawMax ?? '').trim();
              if (!(min && max)) {
                return;
              }
              apply(
                `${dateExpr} BETWEEN :${valueParam} AND :${valueParam2}`,
                withCol({ [valueParam]: min, [valueParam2]: max }),
              );
              break;
            }
            throw new BadRequestException(
              `Оператор between не поддерживается для типа ${columnType}`,
            );
          }
          case 'in': {
            const value = filter.value;
            const arr = Array.isArray(value)
              ? value
              : typeof value === 'string'
                ? value.split(',')
                : [];
            const values = arr.map(v => String(v).trim()).filter(Boolean);
            if (!values.length) {
              return;
            }

            if (columnType === CustomTableColumnType.MULTI_SELECT) {
              apply(
                `(CASE WHEN jsonb_typeof(r.data -> :${colParam}) = 'array'
                  THEN EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(r.data -> :${colParam}) AS elem
                    WHERE elem IN (:...${valuesParam})
                  )
                  ELSE false END)`,
                withCol({ [valuesParam]: values }),
              );
              break;
            }

            if (isNumericColumnType(columnType)) {
              const nums = values.map(v => Number(v)).filter(v => Number.isFinite(v));
              if (!nums.length) {
                return;
              }
              apply(`${numericExpr} IN (:...${valuesParam})`, withCol({ [valuesParam]: nums }));
              break;
            }

            apply(`${textExpr} IN (:...${valuesParam})`, withCol({ [valuesParam]: values }));
            break;
          }
          default:
            throw new BadRequestException(`Неизвестный оператор фильтра: ${op}`);
        }
      });
    }
  }

  private applyRowSort(
    query: SelectQueryBuilder<CustomTableRow>,
    sort: CustomTableRowSortDto,
    typeByKey: Map<string, CustomTableColumnType>,
  ): void {
    const col = sort.col?.trim();
    if (!col) {
      throw new BadRequestException('Некорректная сортировка');
    }
    const columnType = typeByKey.get(col);
    if (!columnType) {
      throw new BadRequestException(`Колонка для сортировки не найдена: ${col}`);
    }
    const direction = sort.dir === 'desc' ? 'DESC' : 'ASC';
    const sortExpr = this.sortExprForColumnType('s_col', columnType);
    // Пустые ячейки всегда внизу — иначе при DESC список открывается пустотой.
    query
      .orderBy(sortExpr, direction, 'NULLS LAST')
      .addOrderBy('r.rowNumber', 'ASC')
      .setParameter('s_col', col);
  }

  /**
   * Базовый запрос строк с фильтрами и сортировкой, но без пагинации.
   * Общий для выдачи строк и экспорта, чтобы выгрузка совпадала с тем,
   * что пользователь видит на экране.
   */
  private async buildRowsQuery(
    tableId: string,
    params: { filters?: CustomTableRowFilterDto[]; sort?: CustomTableRowSortDto },
  ): Promise<SelectQueryBuilder<CustomTableRow>> {
    const query = this.customTableRowRepository
      .createQueryBuilder('r')
      .where('r.tableId = :tableId', { tableId })
      .orderBy('r.rowNumber', 'ASC')
      .addOrderBy('r.id', 'ASC');

    const rawFilters = params.filters?.filter(Boolean) || [];
    const typeByKey =
      rawFilters.length || params.sort
        ? await this.loadColumnTypeMap(tableId)
        : new Map<string, CustomTableColumnType>();

    this.applyRowFilters(query, rawFilters, typeByKey);
    if (params.sort) {
      this.applyRowSort(query, params.sort, typeByKey);
    }
    return query;
  }

  /**
   * Значение ячейки для выгрузки. Числа и булевы отдаём нативными типами,
   * чтобы в Excel они оставались числом и флагом, а не текстом.
   */
  private exportCellValue(raw: unknown, columnType: CustomTableColumnType): unknown {
    if (raw === null || raw === undefined) {
      return '';
    }
    if (Array.isArray(raw)) {
      return raw.map(v => String(v ?? '')).join(', ');
    }
    if (isNumericColumnType(columnType)) {
      const num = Number(raw);
      return Number.isFinite(num) ? num : String(raw);
    }
    if (columnType === CustomTableColumnType.BOOLEAN) {
      if (typeof raw === 'boolean') {
        return raw;
      }
      const text = String(raw).toLowerCase();
      if (['true', 't', '1', 'yes', 'y'].includes(text)) {
        return true;
      }
      if (['false', 'f', '0', 'no', 'n'].includes(text)) {
        return false;
      }
      return String(raw);
    }
    if (typeof raw === 'object') {
      return JSON.stringify(raw);
    }
    return String(raw);
  }

  /**
   * SELECT-выражения агрегатов с алиасами agg_0..agg_N. Общие для плоских
   * итогов и для группировки, чтобы одна и та же функция считалась одинаково.
   */
  private buildAggregateSelections(
    query: SelectQueryBuilder<CustomTableRow>,
    aggs: CustomTableAggregateDto[],
    typeByKey: Map<string, CustomTableColumnType>,
  ): string[] {
    return aggs.map((agg, index) => {
      const col = agg.col?.trim();
      if (!col) {
        throw new BadRequestException('Некорректный агрегат');
      }
      const columnType = typeByKey.get(col);
      if (!columnType) {
        throw new BadRequestException(`Колонка для агрегата не найдена: ${col}`);
      }
      if (!CUSTOM_TABLE_AGGREGATE_FNS.includes(agg.fn)) {
        throw new BadRequestException(`Неизвестная функция агрегата: ${agg.fn}`);
      }

      const colParam = `a_col_${index}`;
      const exprs = this.buildTypedValueExprs(colParam);
      query.setParameter(colParam, col);

      if (agg.fn === 'count') {
        // Считаем заполненные ячейки: пустые в итог не идут.
        return `COUNT(NULLIF(${exprs.textCoalescedExpr}, '')) AS "agg_${index}"`;
      }
      if (isNumericColumnType(columnType)) {
        return `${agg.fn.toUpperCase()}(${exprs.numericExpr}) AS "agg_${index}"`;
      }
      if (columnType === CustomTableColumnType.DATE && (agg.fn === 'min' || agg.fn === 'max')) {
        return `${agg.fn.toUpperCase()}(${exprs.dateExpr}) AS "agg_${index}"`;
      }
      throw new BadRequestException(`Функция ${agg.fn} не поддерживается для типа ${columnType}`);
    });
  }

  /** Приводит сырое значение агрегата из БД к числу или дате. */
  private normalizeAggregateValue(value: unknown): number | string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : String(value);
  }

  /**
   * Поиск дублей по составному ключу. Строки в таблицы попадают из разных
   * выписок, поэтому повторы неизбежны и ищутся не по точному совпадению
   * строки целиком, а по выбранным колонкам с нормализацией.
   */
  async findDuplicateRows(
    workspaceId: string,
    tableId: string,
    params: { keys: string[]; limit?: number },
  ): Promise<{
    items: Array<{ key: string; count: number; rowIds: string[]; rowNumbers: number[] }>;
    groupCount: number;
  }> {
    await this.requireTable(workspaceId, tableId);

    const keys = Array.from(new Set((params.keys ?? []).map(k => k.trim()).filter(Boolean)));
    if (!keys.length) {
      throw new BadRequestException('Не указаны колонки для поиска дублей');
    }
    if (keys.length > 10) {
      throw new BadRequestException('Слишком много колонок в ключе');
    }

    const typeByKey = await this.loadColumnTypeMap(tableId);
    for (const key of keys) {
      if (!typeByKey.has(key)) {
        throw new BadRequestException(`Колонка не найдена: ${key}`);
      }
    }

    const query = this.customTableRowRepository
      .createQueryBuilder('r')
      .where('r.tableId = :tableId', { tableId });

    // Регистр и лишние пробелы не должны мешать: «Магнум » и «магнум» — одно.
    const parts = keys.map((key, index) => {
      const param = `d_col_${index}`;
      query.setParameter(param, key);
      return `lower(trim(COALESCE(r.data ->> :${param}, '')))`;
    });
    // Разделитель — управляющий символ: в данных его не бывает, поэтому
    // склейка «аб|в» и «а|бв» не даст ложного совпадения.
    const keyExpr = parts.join(' || chr(31) || ');

    const safeLimit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const rows = await query
      .select([
        `${keyExpr} AS "dup_key"`,
        'COUNT(*) AS "dup_count"',
        'array_agg(r.id::text) AS "row_ids"',
        'array_agg(r.rowNumber) AS "row_numbers"',
      ])
      .groupBy(keyExpr)
      // Полностью пустой ключ — не дубль, а просто незаполненные строки.
      .having(`COUNT(*) > 1 AND ${keyExpr} <> ${keys.map(() => "''").join(' || chr(31) || ')}`)
      .orderBy('COUNT(*)', 'DESC')
      .limit(safeLimit)
      .getRawMany<Record<string, unknown>>();

    const items = rows.map(row => ({
      key: String(row.dup_key ?? '')
        .split('')
        .join(' · '),
      count: Number(row.dup_count) || 0,
      rowIds: Array.isArray(row.row_ids) ? (row.row_ids as string[]) : [],
      rowNumbers: Array.isArray(row.row_numbers)
        ? (row.row_numbers as unknown[]).map(n => Number(n))
        : [],
    }));

    return { items, groupCount: items.length };
  }

  /**
   * Итоги по колонкам. Считает база по всем строкам выборки — грид держит
   * в памяти лишь окно из 50 строк, и складывать надо не его.
   */
  async aggregateRows(
    workspaceId: string,
    tableId: string,
    params: { filters?: CustomTableRowFilterDto[]; aggs: CustomTableAggregateDto[] },
  ): Promise<{ items: CustomTableAggregateResult[]; total: number }> {
    await this.requireTable(workspaceId, tableId);

    const aggs = params.aggs?.filter(Boolean) ?? [];
    if (!aggs.length) {
      return { items: [], total: 0 };
    }
    if (aggs.length > 50) {
      throw new BadRequestException('Слишком много агрегатов');
    }

    const typeByKey = await this.loadColumnTypeMap(tableId);
    const query = await this.buildRowsQuery(tableId, { filters: params.filters });
    const total = await query.getCount();

    // ORDER BY из базового запроса несовместим с агрегацией без GROUP BY.
    query.orderBy();

    const selections = this.buildAggregateSelections(query, aggs, typeByKey);

    const raw = await query.select(selections).getRawOne<Record<string, unknown>>();

    const items = aggs.map((agg, index) => ({
      col: agg.col,
      fn: agg.fn,
      value: this.normalizeAggregateValue(raw?.[`agg_${index}`]),
    }));

    return { items, total };
  }

  /**
   * Группировка с итогами по каждой группе. Считает база: собрать группы
   * из подгруженного окна строк нельзя — они охватывают всю выборку.
   */
  async groupRows(
    workspaceId: string,
    tableId: string,
    params: {
      groupBy: string;
      filters?: CustomTableRowFilterDto[];
      aggs?: CustomTableAggregateDto[];
      limit?: number;
    },
  ): Promise<{
    items: Array<{
      key: string | null;
      count: number;
      aggregates: CustomTableAggregateResult[];
    }>;
    groupCount: number;
  }> {
    await this.requireTable(workspaceId, tableId);

    const groupBy = params.groupBy?.trim();
    if (!groupBy) {
      throw new BadRequestException('Не указана колонка группировки');
    }

    const typeByKey = await this.loadColumnTypeMap(tableId);
    if (!typeByKey.has(groupBy)) {
      throw new BadRequestException(`Колонка для группировки не найдена: ${groupBy}`);
    }

    const aggs = params.aggs?.filter(Boolean) ?? [];
    if (aggs.length > 50) {
      throw new BadRequestException('Слишком много агрегатов');
    }

    const query = await this.buildRowsQuery(tableId, { filters: params.filters });
    // Порядок строк из базового запроса к группам отношения не имеет.
    query.orderBy();

    const groupExpr = this.buildTypedValueExprs('g_col').textExpr;
    query.setParameter('g_col', groupBy);

    const selections = [
      `${groupExpr} AS "group_key"`,
      'COUNT(*) AS "group_count"',
      ...this.buildAggregateSelections(query, aggs, typeByKey),
    ];

    const safeLimit = Math.min(Math.max(params.limit ?? 200, 1), 1000);
    const rows = await query
      .select(selections)
      .groupBy(groupExpr)
      // Крупные группы первыми: с них обычно и начинают разбираться.
      .orderBy('COUNT(*)', 'DESC')
      .limit(safeLimit)
      .getRawMany<Record<string, unknown>>();

    const items = rows.map(row => ({
      key: row.group_key === null || row.group_key === undefined ? null : String(row.group_key),
      count: Number(row.group_count) || 0,
      aggregates: aggs.map((agg, index) => ({
        col: agg.col,
        fn: agg.fn,
        value: this.normalizeAggregateValue(row[`agg_${index}`]),
      })),
    }));

    return { items, groupCount: items.length };
  }

  async exportRows(
    workspaceId: string,
    tableId: string,
    params: {
      format: 'csv' | 'xlsx';
      filters?: CustomTableRowFilterDto[];
      sort?: CustomTableRowSortDto;
      columnKeys?: string[];
    },
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const table = await this.requireTable(workspaceId, tableId);

    const allColumns = await this.customTableColumnRepository.find({
      where: { tableId },
      order: { position: 'ASC' },
    });
    // Порядок и состав колонок задаёт текущий вид: выгружаем то, что видно.
    const columns = params.columnKeys?.length
      ? params.columnKeys
          .map(key => allColumns.find(c => c.key === key))
          .filter((c): c is CustomTableColumn => Boolean(c))
      : allColumns;

    if (!columns.length) {
      throw new BadRequestException('Нет колонок для экспорта');
    }

    const query = await this.buildRowsQuery(tableId, params);
    const total = await query.getCount();
    if (total > CustomTablesService.MAX_EXPORT_ROWS) {
      throw new BadRequestException(
        `Слишком много строк для экспорта: ${total}. Ограничьте выборку фильтрами (максимум ${CustomTablesService.MAX_EXPORT_ROWS}).`,
      );
    }

    // Тянем страницами, чтобы не поднимать всю таблицу в память одним запросом.
    const records: Record<string, unknown>[] = [];
    const batchSize = 500;
    for (let offset = 0; offset < total; offset += batchSize) {
      const batch = await query.clone().skip(offset).take(batchSize).getMany();
      if (!batch.length) {
        break;
      }
      // Формулы и подписи связей считаем и для выгрузки: иначе колонки
      // уехали бы в файл пустыми или с идентификаторами вместо названий.
      this.applyFormulaColumns(batch, allColumns);
      await this.applyRelationLabels(batch, allColumns);
      for (const row of batch) {
        const record: Record<string, unknown> = {};
        const labels = (row as CustomTableRow & { relationLabels?: Record<string, string> })
          .relationLabels;
        for (const col of columns) {
          const header = col.title || col.key;
          // В выгрузку идёт подпись связанной строки: идентификатор в отчёте
          // человеку ничего не говорит.
          record[header] =
            col.type === CustomTableColumnType.RELATION
              ? (labels?.[col.key] ?? '')
              : this.exportCellValue(row.data?.[col.key], col.type);
        }
        records.push(record);
      }
    }

    const headers = columns.map(col => col.title || col.key);
    const worksheet = xlsx.utils.json_to_sheet(records, { header: headers });

    if (params.format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      return {
        // BOM — иначе Excel открывает кириллицу в CSV как мусор.
        buffer: Buffer.from(`﻿${csv}`, 'utf-8'),
        fileName: normalizeFilename(`${table.name}.csv`),
        contentType: 'text/csv; charset=utf-8',
      };
    }

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Export');
    return {
      buffer: xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer,
      fileName: normalizeFilename(`${table.name}.xlsx`),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async listRows(
    workspaceId: string,
    tableId: string,
    params: {
      cursor?: number;
      offset?: number;
      limit: number;
      filters?: CustomTableRowFilterDto[];
      sort?: CustomTableRowSortDto;
    },
  ): Promise<{ items: CustomTableRow[]; total: number }> {
    await this.requireTable(workspaceId, tableId);

    const query = await this.buildRowsQuery(tableId, params);
    query.take(params.limit);

    const total = await query.getCount();

    if (params.sort) {
      // Keyset-курсор по rowNumber верен только при сортировке по rowNumber.
      // При произвольной сортировке страницы нарезаются смещением.
      query.skip(params.offset ?? 0);
    } else if (params.cursor !== undefined) {
      query.andWhere('r.rowNumber > :cursor', { cursor: params.cursor });
    }

    try {
      const rows = await query.getMany();
      if (!rows.length) {
        return { items: [], total };
      }

      try {
        const rowIds = rows.map(r => r.id);
        const styles = await this.customTableCellStyleRepository.find({
          where: { rowId: In(rowIds) },
          select: ['rowId', 'columnKey', 'style'],
        });
        this.mergeRowStyles(rows, styles);
      } catch (_error) {
        this.logger.warn(`Failed to load cell styles for tableId=${tableId}`);
      }

      const tableColumns = await this.loadColumnsWithConfig(tableId);
      this.applyFormulaColumns(rows, tableColumns);
      await this.applyRelationLabels(rows, tableColumns);

      return { items: rows, total };
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
  }

  /**
   * Заполняет AI-колонку по её промпту. Обобщение classifyPaidStatus: тот же
   * приём (батчи, санитизация, фолбэк), но результат произвольный, а не
   * булев флаг «оплачено».
   */
  async fillAiColumn(
    workspaceId: string,
    tableId: string,
    dto: { columnKey: string; rowIds: string[] },
  ): Promise<{ items: Array<{ rowId: string; value: string | null }>; aiAvailable: boolean }> {
    await this.requireTable(workspaceId, tableId);

    const column = await this.customTableColumnRepository.findOne({
      where: { tableId, key: dto.columnKey },
    });
    if (!column || column.type !== CustomTableColumnType.AI) {
      throw new BadRequestException('Колонка не является AI-колонкой');
    }
    const prompt = column.config?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new BadRequestException('У AI-колонки не задан промпт');
    }

    const rowIds = Array.from(new Set((dto.rowIds ?? []).filter(id => this.isUuid(id))));
    if (!rowIds.length) {
      return { items: [], aiAvailable: true };
    }

    const [rows, columns] = await Promise.all([
      this.customTableRowRepository.find({
        where: { tableId, id: In(rowIds) },
        select: ['id', 'data'],
      }),
      this.customTableColumnRepository.find({
        where: { tableId },
        select: ['key', 'title', 'type'],
      }),
    ]);

    // В модель отправляем только человекочитаемые поля, без служебных
    // и без самой AI-колонки — иначе она будет видеть свой прошлый ответ.
    const sourceColumns = columns.filter(
      col => col.key !== column.key && col.type !== CustomTableColumnType.AI,
    );

    const filler = new AiColumnFiller();
    const inputs = rows.map(row => {
      const data = (row.data ?? {}) as Record<string, unknown>;
      const text = sourceColumns
        .map(col => {
          const value = data[col.key];
          return value === null || value === undefined || String(value).trim() === ''
            ? null
            : `${col.title}: ${String(value)}`;
        })
        .filter(Boolean)
        .join('; ');
      return { id: row.id, text };
    });

    const results: Array<{ id: string; value: string | null }> = [];
    const batchSize = 25;
    for (let i = 0; i < inputs.length; i += batchSize) {
      results.push(...(await filler.fill(prompt, inputs.slice(i, i + batchSize))));
    }

    // Сохраняем: повторный вызов модели стоит денег, а ответ недетерминирован.
    const byId = new Map(results.map(item => [item.id, item.value]));
    for (const row of rows) {
      const value = byId.get(row.id) ?? null;
      if (value === null) {
        continue;
      }
      await this.customTableRowRepository.update(
        { id: row.id },
        { data: { ...((row.data ?? {}) as Record<string, unknown>), [column.key]: value } },
      );
    }

    return {
      items: rowIds.map(rowId => ({ rowId, value: byId.get(rowId) ?? null })),
      aiAvailable: filler.isReady(),
    };
  }

  async classifyPaidStatus(
    workspaceId: string,
    tableId: string,
    dto: ClassifyPaidStatusDto,
  ): Promise<{ items: Array<{ rowId: string; paid: boolean | null }> }> {
    await this.requireTable(workspaceId, tableId);
    const rowIds = Array.isArray(dto.rowIds) ? dto.rowIds.filter(Boolean) : [];
    const uniqueRowIds = Array.from(new Set(rowIds));
    if (!uniqueRowIds.length) {
      return { items: [] };
    }
    const validRowIds = uniqueRowIds.filter(rowId => this.isUuid(rowId));
    if (!validRowIds.length) {
      return {
        items: uniqueRowIds.map(rowId => ({ rowId, paid: null })),
      };
    }

    let rows: CustomTableRow[] = [];
    let columns: CustomTableColumn[] = [];
    try {
      rows = await this.customTableRowRepository.find({
        where: { tableId, id: In(validRowIds) },
        select: ['id', 'data'],
      });
      columns = await this.customTableColumnRepository.find({
        where: { tableId },
        select: ['key', 'title'],
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const { commentKeys, counterpartyKeys } = this.getPaidStatusFieldKeys(columns);
    const inputs: PaidStatusInput[] = rows.map(row => {
      const data = row.data || {};
      let comment = this.collectRowText(data, commentKeys);
      const counterparty = this.collectRowText(data, counterpartyKeys);
      if (!(comment || counterparty)) {
        const fallbackKeys = Object.keys(data);
        comment = this.collectRowText(data, fallbackKeys);
      }
      return {
        id: row.id,
        comment: comment || null,
        counterparty: counterparty || null,
      };
    });

    const classifier = new AiPaidStatusClassifier();
    const results: Array<{ id: string; paid: boolean | null }> = [];
    const batchSize = 25;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const chunkResults = await classifier.classify(batch);
      results.push(...chunkResults);
    }

    const byId = new Map<string, boolean | null>(results.map(item => [item.id, item.paid]));
    const items = uniqueRowIds.map(rowId => ({
      rowId,
      paid: byId.has(rowId) ? (byId.get(rowId) as boolean | null) : null,
    }));
    return { items };
  }

  private isBlankCellValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return String(value).trim() === '';
  }

  /**
   * Проверка флагов колонки на границе записи. До этого isRequired и isUnique
   * только хранились: обязательную колонку можно было оставить пустой, а в
   * уникальную положить дубль.
   *
   * @param rows строки одной операции — в пакетной вставке дубли внутри
   *   самого пакета иначе прошли бы мимо проверки по базе.
   */
  private async validateRowsAgainstColumns(
    tableId: string,
    rows: Array<Record<string, unknown>>,
    options: { excludeRowId?: string; partial?: boolean } = {},
  ): Promise<void> {
    const columns = await this.customTableColumnRepository.find({
      where: { tableId },
      select: ['key', 'title', 'isRequired', 'isUnique', 'type'],
    });
    const guarded = columns.filter(col => col.isRequired || col.isUnique);
    if (!guarded.length) {
      return;
    }

    const seenInBatch = new Map<string, Set<string>>();

    for (const data of rows) {
      for (const col of guarded) {
        const present = Object.prototype.hasOwnProperty.call(data, col.key);
        const value = data[col.key];

        // При частичном обновлении отсутствующий ключ означает «не меняем».
        if (col.isRequired && (present || !options.partial) && this.isBlankCellValue(value)) {
          throw new BadRequestException(`Колонка «${col.title}» обязательна`);
        }

        if (!col.isUnique || !present || this.isBlankCellValue(value)) {
          continue;
        }

        const text = String(value).trim();
        const batchSeen = seenInBatch.get(col.key) ?? new Set<string>();
        if (batchSeen.has(text)) {
          throw new BadRequestException(
            `Значение «${text}» в колонке «${col.title}» повторяется в загрузке`,
          );
        }
        batchSeen.add(text);
        seenInBatch.set(col.key, batchSeen);

        const duplicateQuery = this.customTableRowRepository
          .createQueryBuilder('r')
          .where('r.tableId = :tableId', { tableId })
          .andWhere('r.data ->> :col = :value', { col: col.key, value: text });
        if (options.excludeRowId) {
          duplicateQuery.andWhere('r.id <> :rowId', { rowId: options.excludeRowId });
        }
        if (await duplicateQuery.getExists()) {
          throw new BadRequestException(
            `Значение «${text}» в колонке «${col.title}» уже есть в таблице`,
          );
        }
      }
    }
  }

  async createRow(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: CreateCustomTableRowDto,
  ): Promise<CustomTableRow> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    const allowedKeys = await this.getAllowedColumnKeys(tableId);
    const data = this.sanitizeRowData(dto.data, allowedKeys);
    await this.validateRowsAgainstColumns(tableId, [data]);
    const rowNumber = dto.rowNumber ?? (await this.getNextRowNumber(tableId));

    const row = this.customTableRowRepository.create({
      tableId,
      rowNumber,
      data,
      styles: dto.styles ?? {},
    });
    let saved: CustomTableRow;
    try {
      saved = await this.customTableRowRepository.save(row);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.TABLE_ROW,
      entityId: saved.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: saved },
      meta: { tableId, rowNumber: saved.rowNumber },
    });
    return saved;
  }

  async updateRow(
    userId: string,
    workspaceId: string,
    tableId: string,
    rowId: string,
    dto: UpdateCustomTableRowDto,
  ): Promise<CustomTableRow> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    if (!this.isUuid(rowId)) {
      throw new BadRequestException('Некорректный идентификатор строки');
    }
    let row: CustomTableRow | null = null;
    try {
      row = await this.customTableRowRepository.findOne({
        where: { id: rowId, tableId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!row) {
      throw new NotFoundException('Строка не найдена');
    }

    const allowedKeys = await this.getAllowedColumnKeys(tableId);
    const patch = this.sanitizeRowData(dto.data, allowedKeys);
    await this.validateRowsAgainstColumns(tableId, [patch], {
      excludeRowId: rowId,
      partial: true,
    });
    const beforeData = { ...(row.data || {}) };
    const beforeStyles = row.styles ? { ...row.styles } : null;
    row.data = { ...(row.data || {}), ...patch };
    if (dto.styles && typeof dto.styles === 'object') {
      row.styles = { ...(row.styles || {}), ...dto.styles };
    }

    let saved: CustomTableRow;
    try {
      saved = await this.customTableRowRepository.save(row);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    const patchKeys = Object.keys(patch || {});
    const batchId = patchKeys.length > 1 ? randomUUID() : null;

    for (const key of patchKeys) {
      const beforeValue = beforeData?.[key] ?? null;
      const afterValue = this.toRowDataRecord(saved.data)[key] ?? null;
      await this.logEvent({
        userId,
        workspaceId,
        entityType: EntityType.TABLE_CELL,
        entityId: rowId,
        action: AuditAction.UPDATE,
        diff: {
          before: { value: beforeValue },
          after: { value: afterValue },
        },
        meta: {
          tableId,
          cell: { column: key },
        },
        batchId,
      });
    }

    if (dto.styles && typeof dto.styles === 'object') {
      await this.logEvent({
        userId,
        workspaceId,
        entityType: EntityType.TABLE_ROW,
        entityId: rowId,
        action: AuditAction.UPDATE,
        diff: {
          before: { styles: beforeStyles },
          after: { styles: saved.styles },
        },
        meta: {
          tableId,
          stylesUpdated: true,
        },
      });
    }
    return saved;
  }

  async removeRow(
    userId: string,
    workspaceId: string,
    tableId: string,
    rowId: string,
  ): Promise<void> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    if (!this.isUuid(rowId)) {
      throw new BadRequestException('Некорректный идентификатор строки');
    }
    let row: CustomTableRow | null = null;
    try {
      row = await this.customTableRowRepository.findOne({
        where: { id: rowId, tableId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!row) {
      throw new NotFoundException('Строка не найдена');
    }
    try {
      await this.customTableRowRepository.delete({ id: rowId, tableId });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.TABLE_ROW,
      entityId: rowId,
      action: AuditAction.DELETE,
      diff: { before: row, after: null },
      meta: { tableId, rowNumber: row.rowNumber },
      isUndoable: true,
    });
  }

  async batchCreateRows(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: BatchCreateCustomTableRowsDto,
  ): Promise<{ created: number; rows: CustomTableRow[] }> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.requireTable(workspaceId, tableId);
    const allowedKeys = await this.getAllowedColumnKeys(tableId);

    let nextRowNumber = await this.getNextRowNumber(tableId);
    const rows = dto.rows.map(row => {
      const rowNumber = row.rowNumber ?? nextRowNumber++;
      return this.customTableRowRepository.create({
        tableId,
        rowNumber,
        data: this.sanitizeRowData(row.data, allowedKeys),
      });
    });

    // Весь пакет проверяем разом: дубли внутри одной загрузки база не поймает,
    // потому что до вставки их там ещё нет.
    await this.validateRowsAgainstColumns(
      tableId,
      rows.map(row => this.toRowDataRecord(row.data)),
    );

    let savedRows: CustomTableRow[];
    try {
      savedRows = await this.customTableRowRepository.save(rows);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logRowBatchCreate({
      userId,
      workspaceId,
      tableId,
      rows: savedRows,
      meta: {
        count: rows.length,
      },
    });
    return { created: savedRows.length, rows: savedRows };
  }

  async updateViewSettingsColumn(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: UpdateCustomTableViewSettingsColumnDto,
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);
    const before = { ...table };

    const columnKey = dto.columnKey?.trim();
    if (!columnKey) {
      throw new BadRequestException('columnKey обязателен');
    }

    const column = await this.customTableColumnRepository.findOne({
      where: { tableId, key: columnKey },
      select: ['id', 'key'],
    });
    if (!column) {
      throw new BadRequestException('Колонка не найдена');
    }

    const viewSettings = this.getViewSettingsObject(table) as JsonObject;
    const columns = this.getViewSettingsColumns(viewSettings);
    const existing =
      columns[columnKey] && typeof columns[columnKey] === 'object' ? columns[columnKey] : {};
    const next = { ...existing };

    if (dto.width !== undefined) {
      next.width = dto.width;
    }

    if (dto.aggregate !== undefined) {
      // null снимает итог с колонки, поэтому поле просто не переносится дальше.
      next.aggregate = dto.aggregate ?? undefined;
    }

    columns[columnKey] = next;
    table.viewSettings = { ...viewSettings, columns };

    let saved: CustomTable;
    try {
      saved = await this.customTableRepository.save(table);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: saved.id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: { viewSettings: true },
    });
    return this.getTable(workspaceId, tableId);
  }

  /**
   * Правила условного форматирования. Стиль вычисляется на клиенте при
   * отрисовке, поэтому сервер только хранит и валидирует форму правил.
   */
  async updateViewSettingsRules(
    userId: string,
    workspaceId: string,
    tableId: string,
    rules: Record<string, unknown>[],
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);
    const before = { ...table };

    const columnKeys = new Set((await this.loadColumnTypeMap(tableId)).keys());
    for (const rule of rules) {
      const col = rule?.col;
      if (typeof col !== 'string' || !columnKeys.has(col)) {
        throw new BadRequestException(`Колонка правила не найдена: ${String(col)}`);
      }
      if (rule.target !== 'cell' && rule.target !== 'row') {
        throw new BadRequestException('Правило должно применяться к cell или row');
      }
    }

    const viewSettings = this.getViewSettingsObject(table) as JsonObject;
    table.viewSettings = { ...viewSettings, conditionalRules: rules };

    let saved: CustomTable;
    try {
      saved = await this.customTableRepository.save(table);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: saved.id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: { conditionalRules: true },
    });
    return this.getTable(workspaceId, tableId);
  }

  /**
   * Именованные пресеты вида: фильтры, сортировка, состав колонок и итоги.
   * Заменяют весь набор целиком — клиент всегда присылает актуальный список.
   */
  async updateViewSettingsViews(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: UpdateCustomTableViewsDto,
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.requireTable(workspaceId, tableId);
    const before = { ...table };

    const ids = new Set<string>();
    for (const view of dto.views) {
      if (ids.has(view.id)) {
        throw new BadRequestException(`Дублирующийся идентификатор вида: ${view.id}`);
      }
      ids.add(view.id);

      // class-validator проверяет, что aggregates — объект, но не его значения.
      for (const [col, fn] of Object.entries(view.aggregates ?? {})) {
        if (!CUSTOM_TABLE_AGGREGATE_FNS.includes(fn)) {
          throw new BadRequestException(`Неизвестная функция итога у колонки ${col}: ${fn}`);
        }
      }
    }

    const activeViewId = dto.activeViewId ?? null;
    if (activeViewId && !ids.has(activeViewId)) {
      throw new BadRequestException('Активный вид отсутствует в списке');
    }

    const viewSettings = this.getViewSettingsObject(table) as JsonObject;
    table.viewSettings = { ...viewSettings, views: dto.views, activeViewId };

    let saved: CustomTable;
    try {
      saved = await this.customTableRepository.save(table);
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    await this.logEvent({
      userId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: saved.id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: { savedViews: true },
    });
    return this.getTable(workspaceId, tableId);
  }
}
