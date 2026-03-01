import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomTableImportJobsService } from './custom-table-import-jobs.service';
import { CustomTablesCacheService } from './custom-tables-cache.service';
import { CustomTablesImportService } from './custom-tables-import.service';
import { CustomTablesService } from './custom-tables.service';
import { BatchCreateCustomTableRowsDto } from './dto/batch-create-custom-table-rows.dto';
import { ClassifyPaidStatusDto } from './dto/classify-paid-status.dto';
import { CreateCustomTableColumnDto } from './dto/create-custom-table-column.dto';
import { CreateCustomTableFromDataEntryCustomTabDto } from './dto/create-custom-table-from-data-entry-custom-tab.dto';
import { CreateCustomTableFromDataEntryDto } from './dto/create-custom-table-from-data-entry.dto';
import { CreateCustomTableFromStatementsDto } from './dto/create-custom-table-from-statements.dto';
import { CreateCustomTableRowDto } from './dto/create-custom-table-row.dto';
import { CreateCustomTableDto } from './dto/create-custom-table.dto';
import { GoogleSheetsImportCommitDto } from './dto/google-sheets-import-commit.dto';
import { GoogleSheetsImportPreviewDto } from './dto/google-sheets-import-preview.dto';
import { CustomTableRowFilterDto } from './dto/list-custom-table-rows.dto';
import { ReorderCustomTableColumnsDto } from './dto/reorder-custom-table-columns.dto';
import { UpdateCustomTableColumnDto } from './dto/update-custom-table-column.dto';
import { UpdateCustomTableRowDto } from './dto/update-custom-table-row.dto';
import { UpdateCustomTableViewSettingsColumnDto } from './dto/update-custom-table-view-settings.dto';
import { UpdateCustomTableDto } from './dto/update-custom-table.dto';

@Controller('custom-tables')
@UseGuards(JwtAuthGuard)
export class CustomTablesController {
  constructor(
    private readonly customTablesService: CustomTablesService,
    private readonly customTablesImportService: CustomTablesImportService,
    private readonly importJobsService: CustomTableImportJobsService,
    private readonly customTablesCache: CustomTablesCacheService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async createTable(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomTableDto,
  ) {
    const table = await this.customTablesService.createTable(user.id, workspaceId, dto);
    await this.customTablesCache.bumpList(workspaceId);
    return table;
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listTables(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    const cacheKey = await this.customTablesCache.listKey(workspaceId);
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const items = await this.customTablesService.listTables(workspaceId);
      return { items };
    });
  }

  @Post('import/google-sheets/preview')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async previewGoogleSheets(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: GoogleSheetsImportPreviewDto,
  ) {
    return this.customTablesImportService.previewGoogleSheets(workspaceId, dto);
  }

  @Post('import/google-sheets/commit')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async commitGoogleSheets(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: GoogleSheetsImportCommitDto,
  ) {
    const job = await this.importJobsService.createGoogleSheetsJob(workspaceId, dto as any);
    return { jobId: job.id };
  }

  @Get('import/jobs/:jobId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getImportJob(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    const job = await this.importJobsService.getJobForUser(workspaceId, jobId);
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  }

  @Post('from-data-entry')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async createFromDataEntry(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomTableFromDataEntryDto,
  ) {
    const table = await this.customTablesService.createFromDataEntry(user.id, workspaceId, dto);
    await this.customTablesCache.bumpList(workspaceId);
    return table;
  }

  @Post('from-data-entry-custom-tab')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async createFromDataEntryCustomTab(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomTableFromDataEntryCustomTabDto,
  ) {
    const table = await this.customTablesService.createFromDataEntryCustomTab(
      user.id,
      workspaceId,
      dto,
    );
    await this.customTablesCache.bumpList(workspaceId);
    return table;
  }

  @Post(':id/sync-from-data-entry')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async syncFromDataEntry(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const table = await this.customTablesService.syncFromDataEntry(user.id, workspaceId, id);
    await this.customTablesCache.bumpTable(workspaceId, id);
    await this.customTablesCache.bumpRows(workspaceId, id);
    return table;
  }

  @Post('from-statements')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async createFromStatements(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomTableFromStatementsDto,
  ) {
    const table = await this.customTablesService.createFromStatements(user.id, workspaceId, dto);
    await this.customTablesCache.bumpList(workspaceId);
    return table;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getTable(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const cacheKey = await this.customTablesCache.tableKey(workspaceId, id);
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const table = await this.customTablesService.getTable(workspaceId, id);
      return table;
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async updateTable(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomTableDto,
  ) {
    const table = await this.customTablesService.updateTable(user.id, workspaceId, id, dto);
    await this.customTablesCache.bumpTable(workspaceId, id);
    await this.customTablesCache.bumpList(workspaceId);
    return table;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @Audit({ entityType: EntityType.CUSTOM_TABLE, includeDiff: true, isUndoable: true })
  async removeTable(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.customTablesService.removeTable(user.id, workspaceId, id);
    await this.customTablesCache.bumpList(workspaceId);
    return { ok: true };
  }

  @Post(':id/columns')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async addColumn(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: CreateCustomTableColumnDto,
  ) {
    const column = await this.customTablesService.addColumn(user.id, workspaceId, tableId, dto);
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return column;
  }

  @Patch(':id/columns/:columnId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async updateColumn(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @Body() dto: UpdateCustomTableColumnDto,
  ) {
    const column = await this.customTablesService.updateColumn(
      user.id,
      workspaceId,
      tableId,
      columnId,
      dto,
    );
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return column;
  }

  @Delete(':id/columns/:columnId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async removeColumn(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
  ) {
    await this.customTablesService.removeColumn(user.id, workspaceId, tableId, columnId);
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return { ok: true };
  }

  @Post(':id/columns/reorder')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async reorderColumns(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: ReorderCustomTableColumnsDto,
  ) {
    await this.customTablesService.reorderColumns(user.id, workspaceId, tableId, dto);
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    return { ok: true };
  }

  @Get(':id/rows')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listRows(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('filters') filtersRaw?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), 500);
    const cursorNumber = cursor ? Number(cursor) : undefined;
    let filters: CustomTableRowFilterDto[] | undefined;
    if (filtersRaw) {
      try {
        const parsed = JSON.parse(filtersRaw);
        if (!Array.isArray(parsed)) {
          throw new BadRequestException('Некорректный формат filters');
        }
        filters = parsed as CustomTableRowFilterDto[];
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Некорректный JSON в filters');
      }
    }
    const cacheKey = await this.customTablesCache.rowsKey(workspaceId, tableId, {
      cursor: Number.isFinite(cursorNumber) ? cursorNumber : undefined,
      limit: safeLimit,
      filters,
    });
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const { items, total } = await this.customTablesService.listRows(workspaceId, tableId, {
        cursor: Number.isFinite(cursorNumber) ? cursorNumber : undefined,
        limit: safeLimit,
        filters,
      });
      return { items, meta: { total } };
    });
  }

  @Post(':id/rows/paid-classify')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async classifyPaidStatus(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: ClassifyPaidStatusDto,
  ) {
    return this.customTablesService.classifyPaidStatus(workspaceId, tableId, dto);
  }

  @Post(':id/rows')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async createRow(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: CreateCustomTableRowDto,
  ) {
    const row = await this.customTablesService.createRow(user.id, workspaceId, tableId, dto);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return row;
  }

  @Patch(':id/rows/:rowId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async updateRow(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
    @Body() dto: UpdateCustomTableRowDto,
  ) {
    const row = await this.customTablesService.updateRow(user.id, workspaceId, tableId, rowId, dto);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return row;
  }

  @Delete(':id/rows/:rowId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async removeRow(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
  ) {
    await this.customTablesService.removeRow(user.id, workspaceId, tableId, rowId);
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return { ok: true };
  }

  @Post(':id/rows/batch')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async batchCreateRows(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: BatchCreateCustomTableRowsDto,
  ) {
    const result = await this.customTablesService.batchCreateRows(
      user.id,
      workspaceId,
      tableId,
      dto,
    );
    await this.customTablesCache.bumpRows(workspaceId, tableId);
    return { ok: true, ...result };
  }

  @Patch(':id/view-settings/columns')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async updateViewSettingsColumn(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateCustomTableViewSettingsColumnDto,
  ) {
    const table = await this.customTablesService.updateViewSettingsColumn(
      user.id,
      workspaceId,
      tableId,
      dto,
    );
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    return table;
  }
}
