import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  type MessageEvent,
  ParseIntPipe,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { GoogleSheetsBatchUpdateDto, GoogleSheetsUpdateDto } from './dto/sheets-update.dto';
import { GoogleSheetsWebhookGuard } from './guards/google-sheets-webhook.guard';
import {
  GoogleSheetsAnalyticsService,
  GoogleSheetsSummaryResponse,
} from './services/google-sheets-analytics.service';
import { GoogleSheetsRealtimeService } from './services/google-sheets-realtime.service';
import { GoogleSheetsUpdatesService } from './services/google-sheets-updates.service';

@Controller('integrations/google-sheets')
export class GoogleSheetsIntegrationController {
  constructor(
    private readonly updatesService: GoogleSheetsUpdatesService,
    private readonly realtimeService: GoogleSheetsRealtimeService,
    private readonly analyticsService: GoogleSheetsAnalyticsService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @UseGuards(GoogleSheetsWebhookGuard)
  @Post('update')
  async receiveUpdate(@Body() body: GoogleSheetsUpdateDto) {
    const result = await this.updatesService.handleWebhookUpdate(body);

    if (result.processed && result.row?.googleSheetId) {
      try {
        // Audit: record integration-level sync activity for single row updates.
        await this.auditService.createEvent({
          workspaceId: null,
          actorType: ActorType.INTEGRATION,
          actorId: result.row.userId,
          actorLabel: 'Google Sheets Sync',
          entityType: EntityType.INTEGRATION,
          entityId: result.row.googleSheetId,
          action: AuditAction.UPDATE,
          meta: {
            provider: 'google_sheets',
            spreadsheetId: body.spreadsheetId,
            sheetName: body.sheetName,
            rowNumber: body.row,
          },
        });
      } catch {
        // audit failures should not block sync
      }
    }
    return {
      ok: result.processed,
      reason: result.reason,
      rowId: result.row?.id,
    };
  }

  @Public()
  @UseGuards(GoogleSheetsWebhookGuard)
  @Post('batch')
  async receiveBatch(@Body() body: GoogleSheetsBatchUpdateDto) {
    const batchId = body.items.length > 1 ? uuidv4() : null;
    const results = await this.updatesService.handleBatchUpdate(body, batchId);
    const processedCount = results.filter(item => item.processed).length;

    const firstRow = results.find(item => item.row?.googleSheetId)?.row;
    if (batchId && firstRow?.googleSheetId) {
      try {
        // Audit: record batch sync summary for Google Sheets updates.
        await this.auditService.createEvent({
          workspaceId: null,
          actorType: ActorType.INTEGRATION,
          actorId: firstRow.userId,
          actorLabel: 'Google Sheets Sync',
          entityType: EntityType.INTEGRATION,
          entityId: firstRow.googleSheetId,
          action: AuditAction.IMPORT,
          meta: {
            provider: 'google_sheets',
            spreadsheetId: body.items[0]?.spreadsheetId,
            sheetName: body.items[0]?.sheetName,
            rowsCount: processedCount,
          },
          batchId,
        });
      } catch {
        // audit failures should not block sync
      }
    }

    return { ok: true, processed: processedCount, results };
  }

  @Get('rows')
  async listRows(
    @CurrentUser() user: User,
    @Query('spreadsheetId') spreadsheetId?: string,
    @Query('googleSheetId') googleSheetId?: string,
    @Query('sheetName') sheetName?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), 500);
    const rows = await this.updatesService.listRows({
      userId: user.id,
      spreadsheetId: spreadsheetId || undefined,
      googleSheetId: googleSheetId || undefined,
      sheetName: sheetName || undefined,
      limit: safeLimit,
    });

    return { items: rows };
  }

  @Sse('stream')
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    return this.realtimeService.subscribe(user.id);
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: User,
    @Query('spreadsheetId') spreadsheetId?: string,
    @Query('sheetName') sheetName?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ): Promise<GoogleSheetsSummaryResponse> {
    const summary = await this.analyticsService.getSummary({
      userId: user.id,
      spreadsheetId: spreadsheetId || undefined,
      sheetName: sheetName || undefined,
      days,
    });

    return summary;
  }
}
