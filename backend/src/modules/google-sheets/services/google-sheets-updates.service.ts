import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ActorType, AuditAction, EntityType } from '../../../entities/audit-event.entity';
import { GoogleSheet } from '../../../entities/google-sheet.entity';
import { GoogleSheetRow } from '../../../entities/google-sheet-row.entity';
import { AuditService } from '../../audit/audit.service';
import type { GoogleSheetsBatchUpdateDto, GoogleSheetsUpdateDto } from '../dto/sheets-update.dto';
import {
  GoogleSheetRowEventPayload,
  GoogleSheetsRealtimeService,
} from './google-sheets-realtime.service';

interface ListRowsParams {
  userId: string;
  spreadsheetId?: string;
  googleSheetId?: string;
  sheetName?: string;
  limit?: number;
}

export interface GoogleSheetsUpdateResult {
  processed: boolean;
  reason?: string;
  row?: GoogleSheetRow;
}

@Injectable()
export class GoogleSheetsUpdatesService {
  private readonly logger = new Logger(GoogleSheetsUpdatesService.name);
  private readonly recentEvents = new Map<string, number>();
  private readonly recentEventTtlMs = 10 * 60 * 1000; // 10 minutes
  private readonly allowedSpreadsheetIds: string[];
  private readonly allowedSheetNames: string[];
  private readonly watchColumns: number[];

  constructor(
    @InjectRepository(GoogleSheetRow)
    private readonly sheetRowsRepository: Repository<GoogleSheetRow>,
    @InjectRepository(GoogleSheet)
    private readonly googleSheetsRepository: Repository<GoogleSheet>,
    private readonly realtimeService: GoogleSheetsRealtimeService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.allowedSpreadsheetIds = this.parseList(
      this.configService.get<string>('SHEETS_ALLOWED_SPREADSHEET_IDS') ||
        this.configService.get<string>('SHEETS_ALLOWED_SPREADSHEET_ID'),
    );
    this.allowedSheetNames = this.parseList(
      this.configService.get<string>('SHEETS_ALLOWED_SHEETS') ||
        this.configService.get<string>('SHEETS_ALLOWED_SHEET'),
    );
    this.watchColumns = this.parseNumberList(
      this.configService.get<string>('SHEETS_WATCH_COLUMNS'),
    );
  }

  async handleBatchUpdate(
    batch: GoogleSheetsBatchUpdateDto,
    batchId?: string | null,
  ): Promise<GoogleSheetsUpdateResult[]> {
    const results: GoogleSheetsUpdateResult[] = [];

    for (const item of batch.items) {
      // Process sequentially to keep order and avoid race conditions on the same row
      const result = await this.handleWebhookUpdate(item, batchId);
      results.push(result);
    }

    return results;
  }

  async handleWebhookUpdate(
    dto: GoogleSheetsUpdateDto,
    batchId?: string | null,
  ): Promise<GoogleSheetsUpdateResult> {
    if (dto.row <= 1) {
      throw new BadRequestException('Row number must be greater than 1 (header row is ignored)');
    }

    this.ensureAllowedSpreadsheet(dto.spreadsheetId);
    this.ensureAllowedSheetName(dto.sheetName);

    if (this.shouldIgnoreColumn(dto.editedCell?.col)) {
      this.logger.debug(
        `Ignoring update for column ${dto.editedCell?.col} on sheet ${dto.sheetName} — not in WATCH_COLUMNS`,
      );
      return { processed: false, reason: 'Column not in watch list' };
    }

    const sheet = await this.googleSheetsRepository.findOne({
      where: { sheetId: dto.spreadsheetId, isActive: true },
    });

    if (!sheet) {
      throw new ForbiddenException(
        `Spreadsheet ${dto.spreadsheetId} is not connected or inactive in the system`,
      );
    }

    if (sheet.worksheetName && sheet.worksheetName !== dto.sheetName) {
      this.logger.warn(
        `Worksheet name mismatch for ${dto.spreadsheetId}: expected ${sheet.worksheetName}, got ${dto.sheetName}`,
      );
    }

    if (this.isDuplicateEvent(dto.eventId)) {
      return { processed: false, reason: 'Duplicate event detected' };
    }

    const editedAt = this.parseEditedAt(dto.editedAt);
    const existingRow = await this.sheetRowsRepository.findOne({
      where: {
        spreadsheetId: dto.spreadsheetId,
        sheetName: dto.sheetName,
        rowNumber: dto.row,
      },
    });

    if (
      existingRow?.lastEditedAt &&
      editedAt &&
      existingRow.lastEditedAt.getTime() > editedAt.getTime()
    ) {
      this.logger.debug(
        `Skip stale update for row ${dto.row} (${dto.sheetName}) — incoming editedAt older than stored`,
      );
      return { processed: false, reason: 'Stale event ignored', row: existingRow };
    }

    const payload: Partial<GoogleSheetRow> = {
      googleSheetId: sheet.id,
      userId: sheet.userId,
      spreadsheetId: dto.spreadsheetId,
      sheetName: dto.sheetName,
      rowNumber: dto.row,
      colB: dto.values?.colB ?? null,
      colC: dto.values?.colC ?? null,
      colF: dto.values?.colF ?? null,
      lastEditedAt: editedAt ?? new Date(),
      editedBy: dto.editor ? String(dto.editor) : null,
      editedColumn: dto.editedCell?.col ?? null,
      editedCell: dto.editedCell?.a1 ?? null,
      lastEventId: dto.eventId ?? null,
    };

    await this.sheetRowsRepository.upsert(payload, ['spreadsheetId', 'sheetName', 'rowNumber']);
    const savedRow = await this.sheetRowsRepository.findOne({
      where: {
        spreadsheetId: dto.spreadsheetId,
        sheetName: dto.sheetName,
        rowNumber: dto.row,
      },
    });

    if (!savedRow) {
      throw new InternalServerErrorException('Failed to persist Google Sheets row');
    }

    this.rememberEvent(dto.eventId);
    this.realtimeService.broadcastUpdate(sheet.userId, this.toEventPayload(savedRow));

    try {
      // Audit: record row-level sync changes from Google Sheets.
      await this.auditService.createEvent({
        workspaceId: sheet.workspaceId ?? null,
        actorType: ActorType.INTEGRATION,
        actorId: sheet.userId,
        actorLabel: 'Google Sheets Sync',
        entityType: EntityType.TABLE_ROW,
        entityId: savedRow.id,
        action: existingRow ? AuditAction.UPDATE : AuditAction.CREATE,
        diff: { before: existingRow ?? null, after: savedRow },
        meta: {
          provider: 'google_sheets',
          spreadsheetId: dto.spreadsheetId,
          sheetName: dto.sheetName,
          rowNumber: dto.row,
          editedCell: dto.editedCell?.a1 ?? null,
        },
        batchId: batchId ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Audit event failed for Google Sheets update: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { processed: true, row: savedRow };
  }

  async listRows(params: ListRowsParams): Promise<GoogleSheetRow[]> {
    const where: Record<string, unknown> = { userId: params.userId };

    if (params.spreadsheetId) {
      where.spreadsheetId = params.spreadsheetId;
    }
    if (params.googleSheetId) {
      where.googleSheetId = params.googleSheetId;
    }
    if (params.sheetName) {
      where.sheetName = params.sheetName;
    }

    return this.sheetRowsRepository.find({
      where,
      order: { updatedAt: 'DESC' },
      take: params.limit ?? 50,
    });
  }

  private ensureAllowedSpreadsheet(spreadsheetId: string): void {
    if (
      this.allowedSpreadsheetIds.length > 0 &&
      !this.allowedSpreadsheetIds.includes(spreadsheetId)
    ) {
      throw new ForbiddenException(`Spreadsheet ${spreadsheetId} is not in the allowed list`);
    }
  }

  private ensureAllowedSheetName(sheetName: string): void {
    if (this.allowedSheetNames.length > 0 && !this.allowedSheetNames.includes(sheetName)) {
      throw new ForbiddenException(`Sheet ${sheetName} is not in the allowed list`);
    }
  }

  private shouldIgnoreColumn(column?: number | null): boolean {
    if (!column || this.watchColumns.length === 0) {
      return false;
    }
    return !this.watchColumns.includes(column);
  }

  private parseList(value?: string | null): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  private parseNumberList(value?: string | null): number[] {
    return this.parseList(value)
      .map(item => Number(item))
      .filter(num => !Number.isNaN(num) && num > 0);
  }

  private parseEditedAt(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      this.logger.warn(`Invalid editedAt received: ${value}`);
      return null;
    }

    return parsed;
  }

  private isDuplicateEvent(eventId?: string): boolean {
    if (!eventId) {
      return false;
    }

    const now = Date.now();
    const seenAt = this.recentEvents.get(eventId);

    if (seenAt && now - seenAt < this.recentEventTtlMs) {
      return true;
    }

    this.cleanupEventCache(now);
    return false;
  }

  private rememberEvent(eventId?: string): void {
    if (!eventId) {
      return;
    }

    const now = Date.now();
    this.recentEvents.set(eventId, now);
    this.cleanupEventCache(now);
  }

  private cleanupEventCache(now: number): void {
    for (const [eventId, timestamp] of this.recentEvents.entries()) {
      if (now - timestamp > this.recentEventTtlMs) {
        this.recentEvents.delete(eventId);
      }
    }
  }

  private toEventPayload(row: GoogleSheetRow): GoogleSheetRowEventPayload {
    return {
      id: row.id,
      googleSheetId: row.googleSheetId,
      spreadsheetId: row.spreadsheetId,
      sheetName: row.sheetName,
      rowNumber: row.rowNumber,
      values: {
        colB: row.colB,
        colC: row.colC,
        colF: row.colF,
      },
      editedAt: row.lastEditedAt ? row.lastEditedAt.toISOString() : null,
      editedBy: row.editedBy,
      editedColumn: row.editedColumn,
      editedCell: row.editedCell,
      eventId: row.lastEventId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
