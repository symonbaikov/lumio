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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { buildContentDisposition } from '../../common/utils/http-file.util';
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
import { FillAiColumnDto } from './dto/fill-ai-column.dto';
import { GoogleSheetsImportCommitDto } from './dto/google-sheets-import-commit.dto';
import { GoogleSheetsImportPreviewDto } from './dto/google-sheets-import-preview.dto';
import {
  CUSTOM_TABLE_AGGREGATE_FNS,
  type CustomTableAggregateDto,
  type CustomTableAggregateFn,
  CustomTableRowFilterDto,
  CustomTableRowSortDto,
} from './dto/list-custom-table-rows.dto';
import { ReorderCustomTableColumnsDto } from './dto/reorder-custom-table-columns.dto';
import { UpdateCustomTableColumnDto } from './dto/update-custom-table-column.dto';
import { UpdateCustomTableRowDto } from './dto/update-custom-table-row.dto';
import { UpdateCustomTableViewSettingsColumnDto } from './dto/update-custom-table-view-settings.dto';
import {
  UpdateCustomTableRulesDto,
  UpdateCustomTableViewsDto,
} from './dto/update-custom-table-views.dto';
import { UpdateCustomTableDto } from './dto/update-custom-table.dto';

type GoogleSheetsCommitJobPayload = GoogleSheetsImportCommitDto;

function parseRowFiltersParam(filtersRaw?: string): CustomTableRowFilterDto[] | undefined {
  if (!filtersRaw) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(filtersRaw);
  } catch {
    throw new BadRequestException('Некорректный JSON в filters');
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestException('Некорректный формат filters');
  }
  return parsed as CustomTableRowFilterDto[];
}

function parseAggregatesParam(aggsRaw?: string): CustomTableAggregateDto[] {
  if (!aggsRaw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(aggsRaw);
  } catch {
    throw new BadRequestException('Некорректный JSON в aggs');
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestException('Некорректный формат aggs');
  }
  return parsed.map(entry => {
    const { col, fn } = (entry ?? {}) as { col?: unknown; fn?: unknown };
    if (typeof col !== 'string' || !col.trim()) {
      throw new BadRequestException('Некорректный формат aggs');
    }
    if (
      typeof fn !== 'string' ||
      !CUSTOM_TABLE_AGGREGATE_FNS.includes(fn as CustomTableAggregateFn)
    ) {
      throw new BadRequestException(`Неизвестная функция агрегата: ${String(fn)}`);
    }
    return { col: col.trim(), fn: fn as CustomTableAggregateFn };
  });
}

function parseRowSortParam(sortRaw?: string): CustomTableRowSortDto | undefined {
  if (!sortRaw) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(sortRaw);
  } catch {
    throw new BadRequestException('Некорректный JSON в sort');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Некорректный формат sort');
  }
  const { col, dir } = parsed as { col?: unknown; dir?: unknown };
  if (typeof col !== 'string' || !col.trim()) {
    throw new BadRequestException('Некорректный формат sort');
  }
  if (dir !== 'asc' && dir !== 'desc') {
    throw new BadRequestException('Направление сортировки должно быть asc или desc');
  }
  return { col: col.trim(), dir };
}

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
  async listTables(@CurrentUser() _user: User, @WorkspaceId() workspaceId: string) {
    const cacheKey = await this.customTablesCache.listKey(workspaceId);
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const items = await this.customTablesService.listTables(workspaceId);
      return { items };
    });
  }

  @Post('import/google-sheets/preview')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async previewGoogleSheets(
    @CurrentUser() _user: User,
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
    const job = await this.importJobsService.createGoogleSheetsJob(workspaceId, {
      ...dto,
      importUserId: user.id,
    } as GoogleSheetsCommitJobPayload);
    return { jobId: job.id };
  }

  @Get('import/jobs/:jobId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getImportJob(
    @CurrentUser() _user: User,
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

  @Post(':id/convert-to-statement')
  @WorkspaceAuth(Permission.STATEMENT_UPLOAD, Permission.STATEMENT_EDIT)
  async convertToStatement(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.customTablesService.convertToStatement(user.id, workspaceId, id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async getTable(
    @CurrentUser() _user: User,
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

  @Get(':id/relation-options')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listRelationOptions(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('column') column?: string,
    @Query('search') search?: string,
  ) {
    if (!column?.trim()) {
      throw new BadRequestException('Не указана колонка-связь');
    }
    return this.customTablesService.listRelationOptions(
      workspaceId,
      tableId,
      column.trim(),
      search,
    );
  }

  @Get(':id/duplicates')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async findDuplicates(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('keys') keysRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const keys = (keysRaw ?? '')
      .split(',')
      .map(key => key.trim())
      .filter(Boolean);
    if (!keys.length) {
      throw new BadRequestException('Не указаны колонки для поиска дублей');
    }
    const limitNumber = limitRaw ? Number(limitRaw) : undefined;
    const { items, groupCount } = await this.customTablesService.findDuplicateRows(
      workspaceId,
      tableId,
      { keys, limit: Number.isFinite(limitNumber) ? limitNumber : undefined },
    );
    return { items, meta: { groupCount } };
  }

  @Get(':id/groups')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async groupRows(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('groupBy') groupBy?: string,
    @Query('aggs') aggsRaw?: string,
    @Query('filters') filtersRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    if (!groupBy?.trim()) {
      throw new BadRequestException('Не указана колонка группировки');
    }
    const aggs = parseAggregatesParam(aggsRaw);
    const filters = parseRowFiltersParam(filtersRaw);
    const limitNumber = limitRaw ? Number(limitRaw) : undefined;
    const queryParams = {
      groupBy: groupBy.trim(),
      aggs,
      filters,
      limit: Number.isFinite(limitNumber) ? limitNumber : undefined,
    };
    const cacheKey = await this.customTablesCache.rowsKey(workspaceId, tableId, queryParams);
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const { items, groupCount } = await this.customTablesService.groupRows(
        workspaceId,
        tableId,
        queryParams,
      );
      return { items, meta: { groupCount } };
    });
  }

  @Get(':id/aggregates')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async aggregateRows(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('aggs') aggsRaw?: string,
    @Query('filters') filtersRaw?: string,
  ) {
    const aggs = parseAggregatesParam(aggsRaw);
    const filters = parseRowFiltersParam(filtersRaw);
    const cacheKey = await this.customTablesCache.rowsKey(workspaceId, tableId, {
      aggs,
      filters,
    });
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const { items, total } = await this.customTablesService.aggregateRows(workspaceId, tableId, {
        filters,
        aggs,
      });
      return { items, meta: { total } };
    });
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async exportRows(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Res() res: Response,
    @Query('format') formatRaw?: string,
    @Query('filters') filtersRaw?: string,
    @Query('sort') sortRaw?: string,
    @Query('columns') columnsRaw?: string,
  ) {
    const format = formatRaw === 'csv' ? 'csv' : 'xlsx';
    const columnKeys = columnsRaw
      ? columnsRaw
          .split(',')
          .map(key => key.trim())
          .filter(Boolean)
      : undefined;

    const { buffer, fileName, contentType } = await this.customTablesService.exportRows(
      workspaceId,
      tableId,
      {
        format,
        filters: parseRowFiltersParam(filtersRaw),
        sort: parseRowSortParam(sortRaw),
        columnKeys,
      },
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @Get(':id/rows')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listRows(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('filters') filtersRaw?: string,
    // Новые параметры идут в конец: позиционный порядок прежних сохраняется.
    @Query('sort') sortRaw?: string,
    @Query('offset') offset?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), 500);
    const cursorNumber = cursor ? Number(cursor) : undefined;
    const offsetNumber = offset ? Number(offset) : undefined;
    const filters = parseRowFiltersParam(filtersRaw);
    const sort = parseRowSortParam(sortRaw);
    const queryParams = {
      cursor: Number.isFinite(cursorNumber) ? cursorNumber : undefined,
      offset:
        Number.isFinite(offsetNumber) && (offsetNumber as number) >= 0 ? offsetNumber : undefined,
      limit: safeLimit,
      filters,
      sort,
    };
    const cacheKey = await this.customTablesCache.rowsKey(workspaceId, tableId, queryParams);
    return this.customTablesCache.getOrSet(cacheKey, async () => {
      const { items, total } = await this.customTablesService.listRows(
        workspaceId,
        tableId,
        queryParams,
      );
      return { items, meta: { total } };
    });
  }

  @Post(':id/rows/ai-fill')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async fillAiColumn(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: FillAiColumnDto,
  ) {
    const result = await this.customTablesService.fillAiColumn(workspaceId, tableId, dto);
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    return result;
  }

  @Post(':id/rows/paid-classify')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async classifyPaidStatus(
    @CurrentUser() _user: User,
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

  @Patch(':id/view-settings/rules')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async updateViewSettingsRules(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateCustomTableRulesDto,
  ) {
    const table = await this.customTablesService.updateViewSettingsRules(
      user.id,
      workspaceId,
      tableId,
      dto.rules,
    );
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    return table;
  }

  @Patch(':id/view-settings/views')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async updateViewSettingsViews(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateCustomTableViewsDto,
  ) {
    const table = await this.customTablesService.updateViewSettingsViews(
      user.id,
      workspaceId,
      tableId,
      dto,
    );
    await this.customTablesCache.bumpTable(workspaceId, tableId);
    return table;
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
