import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  ActorType,
  AuditAction,
  type AuditEventDiff,
  EntityType,
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
import { GoogleSheet } from '../../entities/google-sheet.entity';
import { AuditService } from '../audit/audit.service';
import { GoogleSheetsApiService } from '../google-sheets/services/google-sheets-api.service';
import {
  type A1RangeBounds,
  SheetSourceLoaderService,
  numberToColumnLetters,
  parseA1Range,
  quoteSheetName,
} from '../google-sheets/services/sheet-source-loader.service';
import type {
  GoogleSheetsImportColumnDto,
  GoogleSheetsImportCommitDto,
  GoogleSheetsImportManualRowTag,
} from './dto/google-sheets-import-commit.dto';
import {
  GoogleSheetsImportLayoutType,
  type GoogleSheetsImportPreviewDto,
} from './dto/google-sheets-import-preview.dto';

type JsonObject = Record<string, unknown>;

interface GoogleSheetsDriverError {
  driverError?: { code?: string };
}

interface GoogleSheetsRgbColorLike {
  red?: unknown;
  green?: unknown;
  blue?: unknown;
  alpha?: unknown;
}

interface GoogleSheetsTextFormatLike {
  foregroundColor?: GoogleSheetsRgbColorLike;
}

interface GoogleSheetsCellFormatLike {
  backgroundColor?: GoogleSheetsRgbColorLike;
  textFormat?: GoogleSheetsTextFormatLike;
}

interface GoogleSheetsCellLike {
  userEnteredFormat?: GoogleSheetsCellFormatLike;
}

interface GoogleSheetsColumnMetadataLike {
  pixelSize?: unknown;
}

interface GoogleSheetsRowLike {
  values?: GoogleSheetsCellLike[];
}

interface GoogleSheetsSheetDataLike {
  rowData?: GoogleSheetsRowLike[];
  columnMetadata?: GoogleSheetsColumnMetadataLike[];
}

interface GoogleSheetsSheetLike {
  properties?: { title?: string };
  data?: GoogleSheetsSheetDataLike[];
}

interface GoogleSheetsSpreadsheetLike {
  sheets?: GoogleSheetsSheetLike[];
}

interface CustomTableViewColumnSettings {
  width?: number;
}

interface CustomTableViewSettings {
  columns?: Record<string, CustomTableViewColumnSettings>;
  [key: string]: unknown;
}

type RowInsertPayload = Pick<CustomTableRow, 'tableId' | 'rowNumber' | 'data'> & {
  styles?: Record<string, unknown>;
};
type RowInsertQueryPayload = QueryDeepPartialEntity<CustomTableRow>;

const normalizeCellValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const isBooleanLike = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  return ['true', 'false', 'yes', 'no', 'да', 'нет'].includes(v);
};

const isNumberLike = (value: string): boolean => {
  const normalized = value.replace(/\s+/g, '').replace(/,/g, '.');
  return /^-?\d+(\.\d+)?$/.test(normalized);
};

const isDateLike = (value: string): boolean => {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return true;
  return false;
};

const inferColumnType = (values: Array<string | null>): CustomTableColumnType => {
  const cleaned = values
    .map(v => (v === null ? null : v.trim()))
    .filter((v): v is string => Boolean(v?.length));

  if (!cleaned.length) return CustomTableColumnType.TEXT;

  if (cleaned.every(isBooleanLike)) return CustomTableColumnType.BOOLEAN;
  if (cleaned.every(isNumberLike)) return CustomTableColumnType.NUMBER;
  if (cleaned.every(isDateLike)) return CustomTableColumnType.DATE;

  const distinct = new Set(cleaned.map(v => v.toLowerCase()));
  if (cleaned.length >= 10 && distinct.size > 1 && distinct.size <= 12) {
    return CustomTableColumnType.SELECT;
  }

  return CustomTableColumnType.TEXT;
};

type SheetCellStyle = {
  backgroundColor?: string;
};
type SheetCellStylePatch = {
  backgroundColor?: string | null;
};

const clamp01 = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
};

const toCssColorWithOpacity = (
  color: GoogleSheetsRgbColorLike | null | undefined,
  opacity: number,
): string | undefined => {
  if (!color || typeof color !== 'object') return undefined;
  const r = clamp01(color.red);
  const g = clamp01(color.green);
  const b = clamp01(color.blue);
  if (r === null && g === null && b === null) return undefined;
  const rr = Math.round((r ?? 0) * 255);
  const gg = Math.round((g ?? 0) * 255);
  const bb = Math.round((b ?? 0) * 255);
  const alpha = Math.max(0, Math.min(1, opacity));
  return `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
};

const extractSheetStyle = (
  format: GoogleSheetsCellFormatLike | null | undefined,
): SheetCellStyle => {
  if (!format || typeof format !== 'object') return {};
  const style: SheetCellStyle = {};

  const bg = toCssColorWithOpacity(format.backgroundColor, 0.05);
  if (bg) style.backgroundColor = bg;

  return style;
};

const isEmptyStyle = (style: JsonObject | null | undefined): boolean => {
  if (!style || typeof style !== 'object') return true;
  return Object.keys(style).length === 0;
};

const styleSignature = (style: SheetCellStyle): string => {
  const signature: JsonObject = {};
  if (style.backgroundColor !== undefined) {
    signature.backgroundColor = style.backgroundColor;
  }
  return JSON.stringify(signature);
};

const diffStyle = (base: SheetCellStyle, actual: SheetCellStyle): SheetCellStylePatch => {
  const patch: SheetCellStylePatch = {};
  const keys: Array<keyof SheetCellStyle> = ['backgroundColor'];

  for (const key of keys) {
    const baseVal = base[key];
    const actualVal = actual[key];
    const baseHas = baseVal !== undefined;
    const actualHas = actualVal !== undefined;

    if (!baseHas && !actualHas) continue;

    if (!actualHas && baseHas) {
      patch[key] = null;
      continue;
    }

    if (actualHas) {
      const equal = JSON.stringify(baseVal) === JSON.stringify(actualVal);
      if (!baseHas || !equal) {
        patch[key] = actualVal ?? null;
      }
    }
  }

  return patch;
};

export type HighlightedRowTag = 'heading' | 'total';

export interface HighlightedRowInfo {
  rowNumber: number;
  suggestedTag: HighlightedRowTag;
  reason: string;
  backgroundColor?: string;
  textColor?: string;
}

type NormalizedRgbColor = { r: number; g: number; b: number; alpha: number };

const normalizeRgbColor = (
  value: GoogleSheetsRgbColorLike | null | undefined,
): NormalizedRgbColor | null => {
  if (!value || typeof value !== 'object') return null;
  const r = clamp01(value.red);
  const g = clamp01(value.green);
  const b = clamp01(value.blue);
  const alpha = clamp01(value.alpha ?? 1);
  if (r === null || g === null || b === null) return null;
  return { r, g, b, alpha: alpha === null ? 1 : alpha };
};

const normalizedColorKey = (color: NormalizedRgbColor): string =>
  `${color.r.toFixed(4)}-${color.g.toFixed(4)}-${color.b.toFixed(4)}-${color.alpha.toFixed(4)}`;

const normalizedColorToCss = (color: NormalizedRgbColor): string => {
  const toByte = (val: number) => Math.round(Math.max(0, Math.min(1, val)) * 255);
  const rr = toByte(color.r);
  const gg = toByte(color.g);
  const bb = toByte(color.b);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  if (color.alpha < 1) {
    const alpha = Math.max(0, Math.min(1, color.alpha));
    return `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
  }
  return `#${hex(rr)}${hex(gg)}${hex(bb)}`;
};

const colorLuminance = (color: NormalizedRgbColor): number => {
  const toLinear = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
};

const contrastRatio = (lumA: number, lumB: number): number => {
  const bright = Math.max(lumA, lumB);
  const dark = Math.min(lumA, lumB);
  return (bright + 0.05) / (dark + 0.05);
};

const detectHighContrastRows = (
  gridRowData: GoogleSheetsRowLike[] | null | undefined,
  startRowNumber: number,
  headerRowIndex: number,
  valuesLength: number,
): HighlightedRowInfo[] => {
  const threshold = 6;
  const maxRows = 80;
  if (!Array.isArray(gridRowData) || !gridRowData.length) return [];
  const limit = Math.min(gridRowData.length, valuesLength);
  if (limit <= headerRowIndex + 1) return [];

  const results: HighlightedRowInfo[] = [];

  for (let rowIdx = headerRowIndex + 1; rowIdx < limit && results.length < maxRows; rowIdx += 1) {
    const row = gridRowData[rowIdx];
    if (!row || !Array.isArray(row.values)) continue;

    const backgroundMap = new Map<string, { color: NormalizedRgbColor; count: number }>();
    const textMap = new Map<string, { color: NormalizedRgbColor; count: number }>();

    for (const cell of row.values) {
      const format = cell?.userEnteredFormat;
      if (!format) continue;

      const bgColor = normalizeRgbColor(format.backgroundColor);
      if (bgColor) {
        const key = normalizedColorKey(bgColor);
        const existing = backgroundMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          backgroundMap.set(key, { color: bgColor, count: 1 });
        }
      }

      const textFormat = format.textFormat;
      if (textFormat) {
        const fgColor = normalizeRgbColor(textFormat.foregroundColor);
        if (fgColor) {
          const key = normalizedColorKey(fgColor);
          const existing = textMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            textMap.set(key, { color: fgColor, count: 1 });
          }
        }
      }
    }

    const pickBestColor = (map: Map<string, { color: NormalizedRgbColor; count: number }>) => {
      let best: NormalizedRgbColor | null = null;
      let bestCount = -1;
      for (const entry of map.values()) {
        if (entry.count > bestCount) {
          bestCount = entry.count;
          best = entry.color;
        }
      }
      return best;
    };

    const dominantBg = pickBestColor(backgroundMap);
    if (!dominantBg) continue;
    const dominantText = pickBestColor(textMap);

    const bgLum = colorLuminance(dominantBg);
    const fallbackText =
      bgLum < 0.5 ? { r: 1, g: 1, b: 1, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 1 };
    const chosenText = dominantText || fallbackText;
    const textLum = colorLuminance(chosenText);

    const ratio = contrastRatio(bgLum, textLum);
    if (ratio < threshold) continue;

    const suggestedTag: HighlightedRowTag = bgLum < textLum ? 'heading' : 'total';
    results.push({
      rowNumber: startRowNumber + rowIdx,
      suggestedTag,
      reason: `Контраст ${ratio.toFixed(1)}:1`,
      backgroundColor: normalizedColorToCss(dominantBg),
      textColor: normalizedColorToCss(chosenText),
    });
  }

  return results;
};

@Injectable()
export class CustomTablesImportService {
  private readonly logger = new Logger(CustomTablesImportService.name);

  constructor(
    @InjectRepository(GoogleSheet)
    private readonly googleSheetRepository: Repository<GoogleSheet>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CustomTable)
    private readonly customTableRepository: Repository<CustomTable>,
    @InjectRepository(CustomTableColumn)
    private readonly customTableColumnRepository: Repository<CustomTableColumn>,
    @InjectRepository(CustomTableRow)
    private readonly customTableRowRepository: Repository<CustomTableRow>,
    @InjectRepository(CustomTableColumnStyle)
    private readonly customTableColumnStyleRepository: Repository<CustomTableColumnStyle>,
    @InjectRepository(CustomTableCellStyle)
    private readonly customTableCellStyleRepository: Repository<CustomTableCellStyle>,
    private readonly googleSheetsApiService: GoogleSheetsApiService,
    private readonly auditService: AuditService,
    private readonly sheetSourceLoader: SheetSourceLoaderService,
  ) {}

  private getDriverErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null) {
      return (error as GoogleSheetsDriverError).driverError?.code;
    }
    return undefined;
  }

  private getSheetEntry(
    spreadsheet: GoogleSheetsSpreadsheetLike | undefined,
    worksheetName: string,
  ): GoogleSheetsSheetLike | undefined {
    return (
      spreadsheet?.sheets?.find(sheet => sheet?.properties?.title === worksheetName) ||
      spreadsheet?.sheets?.[0]
    );
  }

  private getColumnSourceConfig(
    config: CustomTableColumn['config'] | null | undefined,
  ): { colIndex?: number } | null {
    if (!config || typeof config !== 'object') {
      return null;
    }
    const source = (config as { source?: unknown }).source;
    return typeof source === 'object' && source !== null ? (source as { colIndex?: number }) : null;
  }

  private getViewSettings(table: CustomTable): CustomTableViewSettings {
    return table.viewSettings && typeof table.viewSettings === 'object'
      ? (table.viewSettings as CustomTableViewSettings)
      : {};
  }

  private toViewSettingsPatch(
    viewSettings: CustomTableViewSettings,
  ): QueryDeepPartialEntity<Record<string, unknown>> {
    return viewSettings as QueryDeepPartialEntity<Record<string, unknown>>;
  }

  private toRowInsertQueryPayload(rows: RowInsertPayload[]): RowInsertQueryPayload[] {
    return rows as RowInsertQueryPayload[];
  }

  private generateColumnKey(): string {
    const raw = randomUUID().replace(/-/g, '');
    return `col_${raw.slice(0, 12)}`;
  }

  private async logIntegrationEvent(params: {
    userId: string;
    workspaceId: string | null;
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    meta?: JsonObject | null;
    diff?: AuditEventDiff | null;
    batchId?: string | null;
  }) {
    try {
      // Audit: record integration-driven table changes during import.
      await this.auditService.createEvent({
        workspaceId: params.workspaceId,
        actorType: ActorType.INTEGRATION,
        actorId: params.userId,
        actorLabel: 'Google Sheets Import',
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        diff: params.diff ?? null,
        meta: params.meta ?? null,
        batchId: params.batchId ?? null,
      });
    } catch {
      this.logger.warn(`Audit log write failed for action=${params.action}`);
    }
  }

  private async logIntegrationRowBatch(params: {
    userId: string;
    workspaceId: string | null;
    tableId: string;
    rows: CustomTableRow[];
    meta?: JsonObject | null;
  }) {
    if (!params.rows.length) return;
    try {
      await this.auditService.createBatchEvents(
        params.rows.map(row => ({
          workspaceId: params.workspaceId,
          actorType: ActorType.INTEGRATION,
          actorId: params.userId,
          actorLabel: 'Google Sheets Import',
          entityType: EntityType.TABLE_ROW,
          entityId: row.id,
          action: AuditAction.CREATE,
          diff: { before: null, after: row },
          meta: { tableId: params.tableId, rowNumber: row.rowNumber, ...(params.meta || {}) },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Audit log batch write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

  private async resolveCategoryId(userId: string, categoryId: string): Promise<string> {
    let category: Category | null = null;
    try {
      category = await this.categoryRepository.findOne({
        where: { id: categoryId, userId },
      });
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }
    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }
    return category.id;
  }

  private async requireGoogleSheet(
    workspaceId: string,
    googleSheetId: string,
  ): Promise<GoogleSheet> {
    const sheet = await this.googleSheetRepository.findOne({
      where: { id: googleSheetId, workspaceId, isActive: true },
    });
    if (!sheet) {
      throw new NotFoundException('Google Sheet не найден или недоступен');
    }
    if (!sheet.refreshToken || sheet.refreshToken.includes('placeholder')) {
      throw new BadRequestException(
        'Отсутствует refresh token Google. Подключите таблицу через OAuth.',
      );
    }
    return sheet;
  }

  private async resolveWorksheetName(sheet: GoogleSheet, preferred?: string): Promise<string> {
    if (preferred?.trim()) return preferred.trim();
    if (sheet.worksheetName?.trim()) return sheet.worksheetName.trim();

    const info = await this.googleSheetsApiService.getSpreadsheetInfo(
      sheet.accessToken,
      sheet.sheetId,
    );
    if (!info.firstWorksheet) {
      throw new BadRequestException('Не удалось определить лист Google Sheets');
    }
    return info.firstWorksheet;
  }

  private buildRange(worksheetName: string, range?: string): string {
    if (range?.includes('!')) {
      return range;
    }

    const sheetRef = quoteSheetName(worksheetName);
    if (!range) {
      return sheetRef;
    }

    return `${sheetRef}!${range}`;
  }

  private detectLayout(values: unknown[][], headerRowIndex: number): GoogleSheetsImportLayoutType {
    const header = (values[headerRowIndex] || [])
      .map(v => normalizeCellValue(v))
      .filter(Boolean) as string[];
    const data = values.slice(headerRowIndex + 1, headerRowIndex + 1 + 20);

    const headerDateLikeCount = header.filter(v => isDateLike(v)).length;
    const wide = header.length >= 12;

    let firstColNonEmpty = 0;
    for (const row of data) {
      const first = normalizeCellValue(row?.[0]);
      if (first) firstColNonEmpty += 1;
    }

    if (
      wide &&
      headerDateLikeCount >= Math.max(5, Math.floor(header.length * 0.4)) &&
      firstColNonEmpty >= 8
    ) {
      return GoogleSheetsImportLayoutType.MATRIX;
    }

    return GoogleSheetsImportLayoutType.FLAT;
  }

  private buildPreviewFromValues(params: {
    spreadsheetId: string;
    worksheetName: string;
    effectiveRange: string;
    bounds: A1RangeBounds;
    values: unknown[][];
    dto: GoogleSheetsImportPreviewDto;
  }) {
    const { spreadsheetId, worksheetName, effectiveRange, bounds, values, dto } = params;
    const rowsCount = Math.max(bounds.endRow - bounds.startRow + 1, 0);
    const colsCount = Math.max(bounds.endCol - bounds.startCol + 1, 0);
    const headerRowIndex = dto.headerRowIndex ?? 0;
    const safeHeaderIndex = Math.min(Math.max(headerRowIndex, 0), Math.max(values.length - 1, 0));
    const layout =
      dto.layoutType && dto.layoutType !== GoogleSheetsImportLayoutType.AUTO
        ? dto.layoutType
        : this.detectLayout(values, safeHeaderIndex);

    const sampleRowCount = 10;
    const sample = values.slice(safeHeaderIndex + 1, safeHeaderIndex + 1 + sampleRowCount);
    const columns = Array.from({ length: colsCount }).map((_, idx) => {
      const colLetter = numberToColumnLetters(bounds.startCol + idx);
      const headerValue = normalizeCellValue(values?.[safeHeaderIndex]?.[idx]);
      const sampleValues = sample.map(row => normalizeCellValue(row?.[idx]));
      return {
        index: idx,
        a1: colLetter,
        title: headerValue || colLetter,
        suggestedType: inferColumnType(sampleValues),
        include: true,
      };
    });

    return {
      spreadsheetId,
      worksheetName,
      usedRange: {
        a1: effectiveRange,
        startRow: bounds.startRow,
        startCol: bounds.startCol,
        endRow: bounds.endRow,
        endCol: bounds.endCol,
        rowsCount,
        colsCount,
      },
      layoutSuggested: layout,
      headerRowIndex: safeHeaderIndex,
      sampleRows: sample.map((row, idx) => ({
        rowNumber: bounds.startRow + safeHeaderIndex + 1 + idx,
        values: Array.from({ length: colsCount }).map((_, colIdx) =>
          normalizeCellValue(row?.[colIdx]),
        ),
        styles: [],
      })),
      columns,
      highlightedRows: [],
    };
  }

  private async executePublicGoogleSheetsCommit(
    workspaceId: string,
    dto: GoogleSheetsImportCommitDto,
    opts?: {
      onProgress?: (progress: number, stage?: string) => void | Promise<void>;
    },
  ) {
    const report = async (progress: number, stage?: string) => {
      try {
        await opts?.onProgress?.(Math.max(0, Math.min(100, Math.floor(progress))), stage);
      } catch {
        // ignore progress errors
      }
    };

    if (!dto.importUserId) {
      throw new BadRequestException('Не удалось определить пользователя для импорта');
    }

    await report(1, 'reading_values');
    const source = await this.sheetSourceLoader.load({
      sourceUrl: dto.sourceUrl,
      worksheetName: dto.worksheetName,
      range: dto.range,
      workspaceId,
    });
    const { values, bounds, effectiveRange, worksheetName } = source;
    const rowsCount = Math.max(bounds.endRow - bounds.startRow + 1, 0);
    const colsCount = Math.max(bounds.endCol - bounds.startCol + 1, 0);
    const headerRowIndex = dto.headerRowIndex ?? 0;
    const safeHeaderIndex = Math.min(Math.max(headerRowIndex, 0), Math.max(values.length - 1, 0));
    const sampleForInference = values.slice(safeHeaderIndex + 1, safeHeaderIndex + 1 + 50);
    const previewColumns = Array.from({ length: colsCount }).map((_, idx) => {
      const colLetter = numberToColumnLetters(bounds.startCol + idx);
      const headerValue = normalizeCellValue(values?.[safeHeaderIndex]?.[idx]);
      const inferred = inferColumnType(
        sampleForInference.map(row => normalizeCellValue(row?.[idx])),
      );
      return {
        index: idx,
        title: headerValue || colLetter,
        suggestedType: inferred,
        a1: colLetter,
      };
    });

    const finalColumns = this.buildFinalColumns(
      previewColumns.map(c => ({
        index: c.index,
        title: c.title,
        suggestedType: c.suggestedType,
      })),
      dto.columns,
    ).filter(c => c.include);

    if (!finalColumns.length) {
      throw new BadRequestException('Нужно выбрать хотя бы одну колонку для импорта');
    }

    await report(5, 'creating_table');
    const categoryId =
      dto.categoryId === null || dto.categoryId === undefined
        ? null
        : await this.resolveCategoryId(dto.importUserId, dto.categoryId);

    let table: CustomTable;
    try {
      table = await this.customTableRepository.save(
        this.customTableRepository.create({
          userId: dto.importUserId,
          workspaceId,
          name: dto.name.trim(),
          description: dto.description ?? null,
          source: CustomTableSource.GOOGLE_SHEETS_IMPORT,
          categoryId,
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    await this.logIntegrationEvent({
      userId: dto.importUserId,
      workspaceId,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: table },
      meta: {
        source: 'google_sheets_public_url_import',
        spreadsheetId: source.spreadsheetId,
        worksheetName,
        usedRange: effectiveRange,
      },
    });

    const createdColumns = await this.customTableColumnRepository.save(
      finalColumns.map((col, position) => {
        const colLetter =
          previewColumns[col.index]?.a1 || numberToColumnLetters(bounds.startCol + col.index);
        return this.customTableColumnRepository.create({
          tableId: table.id,
          key: this.generateColumnKey(),
          title: col.title,
          type: col.suggestedType,
          isRequired: false,
          isUnique: false,
          position,
          config: {
            source: {
              kind: 'google_sheets_public_url',
              spreadsheetId: source.spreadsheetId,
              worksheetName,
              colIndex: col.index,
              colA1: colLetter,
              headerRow: bounds.startRow + safeHeaderIndex,
            },
          },
        });
      }),
    );

    const keyByIndex = new Map<number, string>();
    createdColumns.forEach(col => {
      const sourceConfig = this.getColumnSourceConfig(col.config);
      if (sourceConfig && typeof sourceConfig.colIndex === 'number') {
        keyByIndex.set(sourceConfig.colIndex, col.key);
      }
    });

    if (!dto.importData) {
      await report(100, 'done');
      return {
        tableId: table.id,
        columnsCreated: createdColumns.length,
        rowsCreated: 0,
        usedRange: { a1: effectiveRange, rowsCount, colsCount },
      };
    }

    await report(10, 'importing_rows');
    const rowsToInsert: RowInsertPayload[] = [];
    for (let rowIdx = safeHeaderIndex + 1; rowIdx < values.length; rowIdx += 1) {
      const sourceRowNumber = bounds.startRow + rowIdx;
      const rowValues = values[rowIdx] || [];
      const data: Record<string, string | null> = {};
      for (const col of finalColumns) {
        const key = keyByIndex.get(col.index);
        if (!key) continue;
        data[key] = normalizeCellValue(rowValues?.[col.index]);
      }
      rowsToInsert.push({ tableId: table.id, rowNumber: sourceRowNumber, data });
    }

    const chunkSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      try {
        await this.customTableRowRepository
          .createQueryBuilder()
          .insert()
          .into(CustomTableRow)
          .values(this.toRowInsertQueryPayload(chunk))
          .execute();
      } catch (error) {
        this.throwHelpfulSchemaError(error);
      }
      const fraction = rowsToInsert.length
        ? Math.min(1, (i + chunk.length) / rowsToInsert.length)
        : 1;
      await report(10 + fraction * 85, 'importing_rows');
    }

    await report(100, 'done');
    return {
      tableId: table.id,
      columnsCreated: createdColumns.length,
      rowsCreated: rowsToInsert.length,
      usedRange: { a1: effectiveRange, rowsCount, colsCount },
    };
  }

  async previewGoogleSheets(workspaceId: string, dto: GoogleSheetsImportPreviewDto) {
    if (dto.sourceUrl?.trim()) {
      const source = await this.sheetSourceLoader.load({
        sourceUrl: dto.sourceUrl,
        worksheetName: dto.worksheetName,
        range: dto.range,
        workspaceId,
      });
      return this.buildPreviewFromValues({
        spreadsheetId: source.spreadsheetId,
        worksheetName: source.worksheetName,
        effectiveRange: source.effectiveRange,
        bounds: source.bounds,
        values: source.values,
        dto,
      });
    }

    if (!dto.googleSheetId) {
      throw new BadRequestException('Укажите Google Sheet подключение или ссылку');
    }
    const sheet = await this.requireGoogleSheet(workspaceId, dto.googleSheetId);
    const worksheetName = await this.resolveWorksheetName(sheet, dto.worksheetName);
    const range = this.buildRange(worksheetName, dto.range);

    const {
      accessToken,
      values,
      range: effectiveRange,
    } = await this.googleSheetsApiService.getValues(
      sheet.accessToken,
      sheet.refreshToken,
      sheet.sheetId,
      range,
      {
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      },
    );

    if (accessToken !== sheet.accessToken) {
      sheet.accessToken = accessToken;
      await this.googleSheetRepository.save(sheet);
    }

    const bounds = parseA1Range(effectiveRange);
    const rowsCount = Math.max(bounds.endRow - bounds.startRow + 1, 0);
    const colsCount = Math.max(bounds.endCol - bounds.startCol + 1, 0);

    const headerRowIndex = dto.headerRowIndex ?? 0;
    const safeHeaderIndex = Math.min(Math.max(headerRowIndex, 0), Math.max(values.length - 1, 0));
    const layout =
      dto.layoutType && dto.layoutType !== GoogleSheetsImportLayoutType.AUTO
        ? dto.layoutType
        : this.detectLayout(values, safeHeaderIndex);

    const sampleRowCount = 10;
    const sample = values.slice(safeHeaderIndex + 1, safeHeaderIndex + 1 + sampleRowCount);

    const columns = Array.from({ length: colsCount }).map((_, idx) => {
      const colLetter = numberToColumnLetters(bounds.startCol + idx);
      const headerValue = normalizeCellValue(values?.[safeHeaderIndex]?.[idx]);
      const title = headerValue || colLetter;

      const sampleValues = sample.map(row => normalizeCellValue(row?.[idx]));
      const suggestedType = inferColumnType(sampleValues);

      return {
        index: idx,
        a1: colLetter,
        title,
        suggestedType,
        include: true,
      };
    });

    let highlightedRows: HighlightedRowInfo[] = [];
    let sampleRowStyles: Array<Array<SheetCellStyle | null>> = [];
    const sampleRowIndices = sample.map((_, idx) => safeHeaderIndex + 1 + idx);
    try {
      const grid = await this.googleSheetsApiService.getGridData(
        sheet.accessToken,
        sheet.refreshToken,
        sheet.sheetId,
        effectiveRange,
        {
          fields: 'sheets(properties/title,data/rowData/values/userEnteredFormat)',
        },
      );

      if (grid.accessToken !== sheet.accessToken) {
        sheet.accessToken = grid.accessToken;
        await this.googleSheetRepository.save(sheet);
      }

      const spreadsheet = grid.spreadsheet;
      const sheetEntry = this.getSheetEntry(
        spreadsheet as GoogleSheetsSpreadsheetLike,
        worksheetName,
      );
      const dataEntry = sheetEntry?.data?.[0];
      const gridRowData = Array.isArray(dataEntry?.rowData)
        ? (dataEntry.rowData as GoogleSheetsRowLike[])
        : null;
      highlightedRows = detectHighContrastRows(
        gridRowData,
        bounds.startRow,
        safeHeaderIndex,
        values.length,
      );

      if (gridRowData?.length) {
        sampleRowStyles = sampleRowIndices.map(rowIdx => {
          const row = gridRowData?.[rowIdx];
          if (!row || !Array.isArray(row.values)) return [];
          return Array.from({ length: colsCount }).map((_, colIdx) => {
            const fmt = row.values?.[colIdx]?.userEnteredFormat;
            return extractSheetStyle(fmt);
          });
        });
      }
    } catch (error) {
      this.logger.warn(
        `High contrast detection skipped during preview for googleSheetId=${dto.googleSheetId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return {
      spreadsheetId: sheet.sheetId,
      worksheetName,
      usedRange: {
        a1: effectiveRange,
        startRow: bounds.startRow,
        startCol: bounds.startCol,
        endRow: bounds.endRow,
        endCol: bounds.endCol,
        rowsCount,
        colsCount,
      },
      layoutSuggested: layout,
      headerRowIndex: safeHeaderIndex,
      sampleRows: sample.map((row, idx) => ({
        rowNumber: bounds.startRow + safeHeaderIndex + 1 + idx,
        values: Array.from({ length: colsCount }).map((_, colIdx) =>
          normalizeCellValue(row?.[colIdx]),
        ),
        styles: sampleRowStyles[idx] || [],
      })),
      columns,
      highlightedRows,
    };
  }

  private buildFinalColumns(
    previewColumns: Array<{
      index: number;
      title: string;
      suggestedType: CustomTableColumnType;
    }>,
    override?: GoogleSheetsImportColumnDto[],
  ) {
    if (!override || !override.length) {
      return previewColumns.map(c => ({ ...c, include: true }));
    }

    const byIndex = new Map<number, GoogleSheetsImportColumnDto>();
    for (const item of override) {
      byIndex.set(item.index, item);
    }

    return previewColumns.map(base => {
      const ovr = byIndex.get(base.index);
      return {
        index: base.index,
        title: ovr?.title?.trim() || base.title,
        suggestedType: ovr?.type || base.suggestedType,
        include: ovr?.include ?? true,
      };
    });
  }

  async executeGoogleSheetsCommit(
    workspaceId: string,
    dto: GoogleSheetsImportCommitDto,
    opts?: {
      onProgress?: (progress: number, stage?: string) => void | Promise<void>;
    },
  ) {
    if (dto.sourceUrl?.trim()) {
      return this.executePublicGoogleSheetsCommit(workspaceId, dto, opts);
    }

    if (!dto.googleSheetId) {
      throw new BadRequestException('Укажите Google Sheet подключение или ссылку');
    }

    const report = async (progress: number, stage?: string) => {
      try {
        await opts?.onProgress?.(Math.max(0, Math.min(100, Math.floor(progress))), stage);
      } catch {
        // ignore
      }
    };

    await report(1, 'reading_values');
    const sheet = await this.requireGoogleSheet(workspaceId, dto.googleSheetId);
    const worksheetName = await this.resolveWorksheetName(sheet, dto.worksheetName);
    const range = this.buildRange(worksheetName, dto.range);

    const {
      accessToken,
      values,
      range: effectiveRange,
    } = await this.googleSheetsApiService.getValues(
      sheet.accessToken,
      sheet.refreshToken,
      sheet.sheetId,
      range,
      {
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      },
    );

    if (accessToken !== sheet.accessToken) {
      sheet.accessToken = accessToken;
      await this.googleSheetRepository.save(sheet);
    }

    const bounds = parseA1Range(effectiveRange);
    const rowsCount = Math.max(bounds.endRow - bounds.startRow + 1, 0);
    const colsCount = Math.max(bounds.endCol - bounds.startCol + 1, 0);

    const headerRowIndex = dto.headerRowIndex ?? 0;
    const safeHeaderIndex = Math.min(Math.max(headerRowIndex, 0), Math.max(values.length - 1, 0));

    const sampleForInference = values.slice(safeHeaderIndex + 1, safeHeaderIndex + 1 + 50);
    const previewColumns = Array.from({ length: colsCount }).map((_, idx) => {
      const colLetter = numberToColumnLetters(bounds.startCol + idx);
      const headerValue = normalizeCellValue(values?.[safeHeaderIndex]?.[idx]);
      const title = headerValue || colLetter;
      const inferred = inferColumnType(
        sampleForInference.map(row => normalizeCellValue(row?.[idx])),
      );
      return { index: idx, title, suggestedType: inferred, a1: colLetter };
    });

    const finalColumns = this.buildFinalColumns(
      previewColumns.map(c => ({
        index: c.index,
        title: c.title,
        suggestedType: c.suggestedType,
      })),
      dto.columns,
    ).filter(c => c.include);

    if (!finalColumns.length) {
      throw new BadRequestException('Нужно выбрать хотя бы одну колонку для импорта');
    }

    await report(5, 'creating_table');
    const categoryId =
      dto.categoryId === null || dto.categoryId === undefined
        ? null
        : await this.resolveCategoryId(sheet.userId, dto.categoryId);

    let table: CustomTable;
    try {
      table = await this.customTableRepository.save(
        this.customTableRepository.create({
          userId: sheet.userId,
          name: dto.name.trim(),
          description: dto.description ?? null,
          source: CustomTableSource.GOOGLE_SHEETS_IMPORT,
          categoryId,
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    await this.logIntegrationEvent({
      userId: sheet.userId,
      workspaceId: sheet.workspaceId ?? null,
      entityType: EntityType.CUSTOM_TABLE,
      entityId: table.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: table },
      meta: {
        source: 'google_sheets_import',
        spreadsheetId: sheet.sheetId,
        worksheetName,
        usedRange: effectiveRange,
      },
    });

    let createdColumns: CustomTableColumn[];
    try {
      createdColumns = await this.customTableColumnRepository.save(
        finalColumns.map((col, position) => {
          const colLetter =
            previewColumns[col.index]?.a1 || numberToColumnLetters(bounds.startCol + col.index);
          return this.customTableColumnRepository.create({
            tableId: table.id,
            key: this.generateColumnKey(),
            title: col.title,
            type: col.suggestedType,
            isRequired: false,
            isUnique: false,
            position,
            config: {
              source: {
                kind: 'google_sheets',
                googleSheetId: sheet.id,
                spreadsheetId: sheet.sheetId,
                worksheetName,
                colIndex: col.index,
                colA1: colLetter,
                headerRow: bounds.startRow + safeHeaderIndex,
              },
            },
          });
        }),
      );
    } catch (error) {
      this.throwHelpfulSchemaError(error);
    }

    const keyByIndex = new Map<number, string>();
    createdColumns.forEach(col => {
      const source = this.getColumnSourceConfig(col.config);
      if (source && typeof source.colIndex === 'number') {
        keyByIndex.set(source.colIndex, col.key);
      }
    });

    let gridRowData: GoogleSheetsRowLike[] | null = null;
    let highlightedRows: HighlightedRowInfo[] = [];
    const baseStyleByIndex = new Map<number, SheetCellStyle>();

    try {
      const grid = await this.googleSheetsApiService.getGridData(
        sheet.accessToken,
        sheet.refreshToken,
        sheet.sheetId,
        effectiveRange,
      );

      if (grid.accessToken !== sheet.accessToken) {
        sheet.accessToken = grid.accessToken;
        await this.googleSheetRepository.save(sheet);
      }

      const spreadsheet = grid.spreadsheet;
      const sheetEntry = this.getSheetEntry(
        spreadsheet as GoogleSheetsSpreadsheetLike,
        worksheetName,
      );
      const dataEntry = sheetEntry?.data?.[0];
      gridRowData = Array.isArray(dataEntry?.rowData)
        ? (dataEntry.rowData as GoogleSheetsRowLike[])
        : null;
      const columnMetadata = Array.isArray(dataEntry?.columnMetadata)
        ? (dataEntry.columnMetadata as GoogleSheetsColumnMetadataLike[])
        : null;
      highlightedRows = detectHighContrastRows(
        gridRowData,
        bounds.startRow,
        safeHeaderIndex,
        values.length,
      );

      if (columnMetadata?.length) {
        try {
          const current = this.getViewSettings(table);
          const viewSettings: CustomTableViewSettings = { ...current };
          const columnsSettings: Record<string, CustomTableViewColumnSettings> = {
            ...(viewSettings.columns || {}),
          };

          let changed = false;
          for (const [colIndex, columnKey] of keyByIndex.entries()) {
            const width = columnMetadata?.[colIndex]?.pixelSize;
            if (!(typeof width === 'number' && Number.isFinite(width) && width > 0)) continue;
            const existing =
              columnsSettings[columnKey] && typeof columnsSettings[columnKey] === 'object'
                ? columnsSettings[columnKey]
                : {};
            if (existing.width !== width) {
              columnsSettings[columnKey] = { ...existing, width };
              changed = true;
            }
          }

          if (changed) {
            viewSettings.columns = columnsSettings;
            table.viewSettings = viewSettings as CustomTable['viewSettings'];
            await this.customTableRepository.update(
              { id: table.id },
              { viewSettings: this.toViewSettingsPatch(viewSettings) },
            );
          }
        } catch {
          this.logger.warn(`Google Sheets column width import skipped for tableId=${table.id}`);
        }
      }

      if (gridRowData?.length) {
        const rowLimit = Math.min(gridRowData.length, values.length);
        const columnStyleEntities: CustomTableColumnStyle[] = [];

        for (const [colIndex, columnKey] of keyByIndex.entries()) {
          const headerFormat =
            gridRowData?.[safeHeaderIndex]?.values?.[colIndex]?.userEnteredFormat;
          const headerStyle = extractSheetStyle(headerFormat);

          const counts = new Map<string, { count: number; style: SheetCellStyle }>();
          for (let rowIdx = safeHeaderIndex + 1; rowIdx < rowLimit; rowIdx += 1) {
            const format = gridRowData?.[rowIdx]?.values?.[colIndex]?.userEnteredFormat;
            const style = extractSheetStyle(format);
            const sig = styleSignature(style);
            const existing = counts.get(sig);
            if (existing) {
              existing.count += 1;
            } else {
              counts.set(sig, { count: 1, style });
            }
          }

          let baseStyle: SheetCellStyle = {};
          let bestCount = -1;
          for (const entry of counts.values()) {
            if (entry.count > bestCount) {
              bestCount = entry.count;
              baseStyle = entry.style;
            }
          }

          baseStyleByIndex.set(colIndex, baseStyle);

          const payload: JsonObject = {};
          if (!isEmptyStyle(headerStyle)) payload.header = headerStyle;
          if (!isEmptyStyle(baseStyle)) payload.cell = baseStyle;
          if (Object.keys(payload).length) {
            columnStyleEntities.push(
              this.customTableColumnStyleRepository.create({
                tableId: table.id,
                columnKey,
                style: payload,
              }),
            );
          }
        }

        if (columnStyleEntities.length) {
          await this.customTableColumnStyleRepository.save(columnStyleEntities);
        }
      }
    } catch (error) {
      this.logger.warn(`Google Sheets style import skipped for tableId=${table.id}`);
    }

    if (!dto.importData) {
      await report(100, 'done');
      return {
        tableId: table.id,
        columnsCreated: createdColumns.length,
        rowsCreated: 0,
        usedRange: { a1: effectiveRange, rowsCount, colsCount },
      };
    }

    await report(10, 'importing_rows');
    const dataStartIndex = safeHeaderIndex + 1;
    const autoRowTagsByRowNumber = new Map<number, GoogleSheetsImportManualRowTag>();
    if (Array.isArray(dto.autoRowTags)) {
      for (const tag of dto.autoRowTags) {
        if (tag && typeof tag.rowNumber === 'number' && tag.rowNumber >= 1 && tag.tag) {
          autoRowTagsByRowNumber.set(tag.rowNumber, tag.tag);
        }
      }
    }
    const rowsToInsert: RowInsertPayload[] = [];
    for (let rowIdx = dataStartIndex; rowIdx < values.length; rowIdx += 1) {
      const sourceRowNumber = bounds.startRow + rowIdx;
      const rowValues = values[rowIdx] || [];
      const data: Record<string, string | null> = {};
      for (const col of finalColumns) {
        const key = keyByIndex.get(col.index);
        if (!key) continue;
        const cell = normalizeCellValue(rowValues?.[col.index]);
        if (cell !== null) {
          data[key] = cell;
        } else {
          data[key] = null;
        }
      }
      rowsToInsert.push({
        tableId: table.id,
        rowNumber: sourceRowNumber,
        data,
        styles: (() => {
          const manualTag = autoRowTagsByRowNumber.get(sourceRowNumber);
          if (!manualTag) return undefined;
          return { manualTag };
        })(),
      });
    }

    const chunkSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      try {
        await this.customTableRowRepository
          .createQueryBuilder()
          .insert()
          .into(CustomTableRow)
          .values(this.toRowInsertQueryPayload(chunk))
          .execute();
      } catch (error) {
        this.throwHelpfulSchemaError(error);
      }
      this.logger.log(
        `Imported rows ${i + 1}-${Math.min(i + chunkSize, rowsToInsert.length)} for table ${table.id}`,
      );
      const fraction = rowsToInsert.length
        ? Math.min(1, (i + chunk.length) / rowsToInsert.length)
        : 1;
      await report(10 + fraction * 70, 'importing_rows');
    }

    await report(82, 'loading_styles');
    let rowIdByRowNumber = new Map<number, string>();
    try {
      if (rowsToInsert.length) {
        const minRow = rowsToInsert[0].rowNumber;
        const maxRow = rowsToInsert[rowsToInsert.length - 1].rowNumber;
        const existingRows = await this.customTableRowRepository
          .createQueryBuilder('r')
          .select(['r.id', 'r.rowNumber'])
          .where('r.tableId = :tableId', { tableId: table.id })
          .andWhere('r.rowNumber BETWEEN :minRow AND :maxRow', {
            minRow,
            maxRow,
          })
          .getMany();
        rowIdByRowNumber = new Map(existingRows.map(r => [r.rowNumber, r.id]));
      }
    } catch (error) {
      this.logger.warn(`Failed to build rowId map for tableId=${table.id}`);
    }

    if (rowIdByRowNumber.size) {
      const rowsForAudit = rowsToInsert
        .map(row => {
          const id = rowIdByRowNumber.get(row.rowNumber);
          if (!id) return null;
          return { ...row, id } as CustomTableRow;
        })
        .filter((row): row is CustomTableRow => Boolean(row));

      await this.logIntegrationRowBatch({
        userId: sheet.userId,
        workspaceId: sheet.workspaceId ?? null,
        tableId: table.id,
        rows: rowsForAudit,
        meta: {
          rowsCreated: rowsToInsert.length,
          spreadsheetId: sheet.sheetId,
          worksheetName,
          usedRange: effectiveRange,
        },
      });
    }

    if (gridRowData?.length && keyByIndex.size) {
      try {
        const rowLimit = Math.min(gridRowData.length, values.length);
        const cellCount = Math.max(0, rowLimit - dataStartIndex) * keyByIndex.size;
        const MAX_CELL_STYLE_INSERTS = 50_000;
        if (cellCount > MAX_CELL_STYLE_INSERTS) {
          this.logger.warn(
            `Google Sheets cell style import skipped for tableId=${table.id} (cells=${cellCount} > ${MAX_CELL_STYLE_INSERTS})`,
          );
          return {
            tableId: table.id,
            columnsCreated: createdColumns.length,
            rowsCreated: rowsToInsert.length,
            usedRange: { a1: effectiveRange, rowsCount, colsCount },
          };
        }

        const cellStyleEntities: CustomTableCellStyle[] = [];

        for (let rowIdx = dataStartIndex; rowIdx < rowLimit; rowIdx += 1) {
          const rowNumber = bounds.startRow + rowIdx;
          const rowId = rowIdByRowNumber.get(rowNumber);
          if (!rowId) continue;
          for (const [colIndex, columnKey] of keyByIndex.entries()) {
            const baseStyle = baseStyleByIndex.get(colIndex) || {};
            const format = gridRowData?.[rowIdx]?.values?.[colIndex]?.userEnteredFormat;
            const actualStyle = extractSheetStyle(format);
            const patch = diffStyle(baseStyle, actualStyle);
            if (Object.keys(patch).length === 0) continue;
            cellStyleEntities.push({
              id: randomUUID(),
              rowId,
              columnKey,
              style: patch,
            } as CustomTableCellStyle);
          }
        }

        const chunkSizeStyles = 1000;
        for (let i = 0; i < cellStyleEntities.length; i += chunkSizeStyles) {
          const chunk = cellStyleEntities.slice(i, i + chunkSizeStyles);
          try {
            await this.customTableCellStyleRepository
              .createQueryBuilder()
              .insert()
              .into(CustomTableCellStyle)
              .values(chunk)
              .execute();
          } catch (error) {
            this.throwHelpfulSchemaError(error);
          }
          const fraction = cellStyleEntities.length
            ? Math.min(1, (i + chunk.length) / cellStyleEntities.length)
            : 1;
          await report(85 + fraction * 10, 'saving_styles');
        }
      } catch (error) {
        this.logger.warn(
          `Google Sheets cell style import failed for tableId=${table.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    await report(100, 'done');
    return {
      tableId: table.id,
      columnsCreated: createdColumns.length,
      rowsCreated: rowsToInsert.length,
      usedRange: { a1: effectiveRange, rowsCount, colsCount },
    };
  }

  async commitGoogleSheets(workspaceId: string, dto: GoogleSheetsImportCommitDto) {
    return this.executeGoogleSheetsCommit(workspaceId, dto);
  }
}
