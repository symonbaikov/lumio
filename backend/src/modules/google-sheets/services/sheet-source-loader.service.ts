import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import { appError } from '../../../common/errors/app-error';
import { assertSafeZipDecompressionRatio } from '../../../common/utils/zip-bomb-guard.util';
import { GoogleSheet } from '../../../entities/google-sheet.entity';
import { GoogleSheetsApiService } from './google-sheets-api.service';

export interface A1RangeBounds {
  sheetName: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface LoadedSheetSource {
  spreadsheetId: string;
  worksheetName: string;
  values: unknown[][];
  effectiveRange: string;
  bounds: A1RangeBounds;
  sourceUrl: string;
}

export const MAX_PUBLIC_WORKBOOK_BYTES = 25 * 1024 * 1024;
// `sheetRows` only skips building JS row objects — the xlsx library still
// fully inflates every ZIP entry first, so it does not bound decompression
// cost. assertSafeZipDecompressionRatio (below, before xlsx.read) does that;
// this cap is a secondary bound on how much gets converted into memory.
const MAX_SHEET_ROWS = 50_000;

export const columnLettersToNumber = (lettersRaw: string): number => {
  const letters = lettersRaw.toUpperCase();
  let num = 0;
  for (let i = 0; i < letters.length; i += 1) {
    const code = letters.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    num = num * 26 + (code - 64);
  }
  return num;
};

export const numberToColumnLetters = (numRaw: number): string => {
  let num = numRaw;
  if (num <= 0) return 'A';
  let letters = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    num = Math.floor((num - 1) / 26);
  }
  return letters;
};

const unquoteSheetName = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

export const quoteSheetName = (value: string): string => {
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
};

export const parseA1Range = (rangeRaw: string): A1RangeBounds => {
  const match = rangeRaw.match(/^(.*?)!(\$?[A-Z]+)(\$?\d+)(?::(\$?[A-Z]+)(\$?\d+))?$/);
  if (!match) {
    throw new BadRequestException(appError('SHEETS_RANGE_PARSE_FAILED'));
  }

  const sheetName = unquoteSheetName(match[1]);
  const startCol = columnLettersToNumber(match[2].replace(/\$/g, ''));
  const startRow = Number(match[3].replace(/\$/g, ''));
  const endCol = columnLettersToNumber((match[4] || match[2]).replace(/\$/g, ''));
  const endRow = Number((match[5] || match[3]).replace(/\$/g, ''));

  return { sheetName, startRow, startCol, endRow, endCol };
};

@Injectable()
export class SheetSourceLoaderService {
  constructor(
    @InjectRepository(GoogleSheet)
    private readonly googleSheetRepository: Repository<GoogleSheet>,
    private readonly googleSheetsApiService: GoogleSheetsApiService,
  ) {}

  async load(dto: {
    googleSheetId?: string;
    sourceUrl?: string;
    worksheetName?: string;
    range?: string;
    workspaceId: string;
  }): Promise<LoadedSheetSource> {
    if (dto.googleSheetId) {
      return this.loadFromGoogleSheet(
        dto.workspaceId,
        dto.googleSheetId,
        dto.worksheetName,
        dto.range,
      );
    }
    return this.loadPublicWorkbookSource(dto);
  }

  buildPublicExportUrl(rawUrl: string): {
    url: string;
    spreadsheetId: string;
  } {
    let url: URL;
    try {
      url = new URL(rawUrl.trim());
    } catch {
      throw new BadRequestException(appError('SHEETS_URL_INVALID'));
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException(appError('SHEETS_URL_SCHEME_INVALID'));
    }

    if (url.hostname !== 'docs.google.com') {
      throw new BadRequestException(appError('SHEETS_URL_HOST_INVALID'));
    }

    const publishedMatch = url.pathname.match(/^\/spreadsheets\/d\/e\/([^/]+)/);
    if (publishedMatch) {
      if (!url.searchParams.get('output')) {
        url.searchParams.set('output', 'xlsx');
      }
      return { url: url.toString(), spreadsheetId: publishedMatch[1] };
    }

    const standardMatch = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
    if (!standardMatch) {
      throw new BadRequestException(appError('SHEETS_SPREADSHEET_ID_NOT_FOUND'));
    }

    const spreadsheetId = standardMatch[1];
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
    exportUrl.searchParams.set('format', 'xlsx');
    const gid = url.searchParams.get('gid') || url.hash.match(/gid=(\d+)/)?.[1];
    if (gid) {
      exportUrl.searchParams.set('gid', gid);
    }
    return { url: exportUrl.toString(), spreadsheetId };
  }

  private async fetchPublicWorkbook(rawUrl: string): Promise<Buffer> {
    const { url: exportUrl } = this.buildPublicExportUrl(rawUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(exportUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new BadRequestException(appError('SHEETS_DOWNLOAD_FAILED_SHARE'));
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_PUBLIC_WORKBOOK_BYTES) {
        throw new BadRequestException(appError('SHEETS_FILE_TOO_LARGE'));
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_PUBLIC_WORKBOOK_BYTES) {
        throw new BadRequestException(appError('SHEETS_FILE_TOO_LARGE'));
      }
      return buffer;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(appError('SHEETS_DOWNLOAD_FAILED_LINK_ACCESS'));
    } finally {
      clearTimeout(timeout);
    }
  }

  private getWorkbookRangeBounds(
    worksheetName: string,
    range: string | undefined,
    values: unknown[][],
  ): A1RangeBounds {
    if (range?.trim()) {
      return parseA1Range(
        range.includes('!') ? range.trim() : `${quoteSheetName(worksheetName)}!${range.trim()}`,
      );
    }

    const rows = Math.max(values.length, 1);
    const cols = Math.max(...values.map(row => (Array.isArray(row) ? row.length : 0)), 1);
    return {
      sheetName: worksheetName,
      startRow: 1,
      startCol: 1,
      endRow: rows,
      endCol: cols,
    };
  }

  private cropWorkbookValues(values: unknown[][], bounds: A1RangeBounds): unknown[][] {
    const startRow = Math.max(bounds.startRow - 1, 0);
    const endRow = Math.max(bounds.endRow, bounds.startRow);
    const startCol = Math.max(bounds.startCol - 1, 0);
    const endCol = Math.max(bounds.endCol, bounds.startCol);

    return values.slice(startRow, endRow).map(row => {
      const source = Array.isArray(row) ? row : [];
      return source.slice(startCol, endCol);
    });
  }

  private async loadPublicWorkbookSource(dto: {
    sourceUrl?: string;
    worksheetName?: string;
    range?: string;
  }): Promise<LoadedSheetSource> {
    if (!dto.sourceUrl?.trim()) {
      throw new BadRequestException(appError('SHEETS_URL_REQUIRED'));
    }

    const { spreadsheetId } = this.buildPublicExportUrl(dto.sourceUrl);
    const buffer = await this.fetchPublicWorkbook(dto.sourceUrl);
    let workbook: xlsx.WorkBook;
    try {
      // sourceUrl is an externally-controlled public URL, so this buffer is
      // untrusted content — guard against a decompression bomb before xlsx
      // ever inflates it.
      assertSafeZipDecompressionRatio(buffer);
      workbook = xlsx.read(buffer, { type: 'buffer', raw: false, sheetRows: MAX_SHEET_ROWS });
    } catch {
      throw new BadRequestException(appError('SHEETS_EXPORT_READ_FAILED'));
    }

    if (!workbook.SheetNames.length) {
      throw new BadRequestException(appError('SHEETS_NO_WORKSHEETS'));
    }

    const rangeSheet = dto.range?.includes('!') ? parseA1Range(dto.range).sheetName : '';
    const requestedWorksheet = rangeSheet || dto.worksheetName?.trim() || workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(requestedWorksheet)) {
      throw new BadRequestException(
        appError('SHEETS_WORKSHEET_NOT_FOUND', { worksheet: requestedWorksheet }),
      );
    }

    const worksheet = workbook.Sheets[requestedWorksheet];
    const rawValues = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null,
      blankrows: false,
    }) as unknown[][];
    const normalizedValues = rawValues.map(row => (Array.isArray(row) ? row : []));
    const bounds = this.getWorkbookRangeBounds(requestedWorksheet, dto.range, normalizedValues);
    const values = this.cropWorkbookValues(normalizedValues, bounds);
    const effectiveRange = `${quoteSheetName(bounds.sheetName)}!${numberToColumnLetters(bounds.startCol)}${bounds.startRow}:${numberToColumnLetters(bounds.endCol)}${bounds.endRow}`;

    return {
      spreadsheetId,
      worksheetName: bounds.sheetName,
      values,
      effectiveRange,
      bounds,
      sourceUrl: dto.sourceUrl.trim(),
    };
  }

  private async requireGoogleSheet(
    workspaceId: string,
    googleSheetId: string,
  ): Promise<GoogleSheet> {
    const sheet = await this.googleSheetRepository.findOne({
      where: { id: googleSheetId, workspaceId, isActive: true },
    });
    if (!sheet) {
      throw new NotFoundException(appError('SHEETS_NOT_FOUND'));
    }
    if (!sheet.refreshToken || sheet.refreshToken.includes('placeholder')) {
      throw new BadRequestException(appError('SHEETS_REFRESH_TOKEN_MISSING_CONNECT'));
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
      throw new BadRequestException(appError('SHEETS_WORKSHEET_UNRESOLVED'));
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

  private async loadFromGoogleSheet(
    workspaceId: string,
    googleSheetId: string,
    worksheetNameInput?: string,
    rangeInput?: string,
  ): Promise<LoadedSheetSource> {
    const sheet = await this.requireGoogleSheet(workspaceId, googleSheetId);
    const worksheetName = await this.resolveWorksheetName(sheet, worksheetNameInput);
    const range = this.buildRange(worksheetName, rangeInput);

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

    return {
      spreadsheetId: sheet.sheetId,
      worksheetName: bounds.sheetName,
      values,
      effectiveRange,
      bounds,
      sourceUrl: `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/edit`,
    };
  }
}
