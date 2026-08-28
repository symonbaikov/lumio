import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { appError } from '../../common/errors/app-error';
import { ensureCanEdit } from '../../common/utils/ensure-can-edit.util';
import { CustomTableColumn } from '../../entities/custom-table-column.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTable } from '../../entities/custom-table.entity';
import { GoogleSheet } from '../../entities/google-sheet.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { GoogleSheetsApiService } from '../google-sheets/services/google-sheets-api.service';

export interface SyncResult {
  rows: number;
  syncedAt: Date;
}

/**
 * Регулярное обновление таблицы из Google Sheets.
 *
 * Строки заменяются целиком, а не дописываются: повторный прогон даёт то же
 * состояние, что и первый (см. .claude/rules/idempotency.md). Дозапись при
 * каждом синке множила бы данные.
 *
 * Схема колонок при обновлении НЕ меняется: новые колонки в листе
 * игнорируются. Менять структуру таблицы фоновой задачей опасно — это
 * сломало бы фильтры, виды и формулы, настроенные пользователем.
 */
@Injectable()
export class CustomTableSyncService {
  private readonly logger = new Logger(CustomTableSyncService.name);

  constructor(
    @InjectRepository(CustomTable)
    private readonly tableRepository: Repository<CustomTable>,
    @InjectRepository(CustomTableColumn)
    private readonly columnRepository: Repository<CustomTableColumn>,
    @InjectRepository(CustomTableRow)
    private readonly rowRepository: Repository<CustomTableRow>,
    @InjectRepository(GoogleSheet)
    private readonly googleSheetRepository: Repository<GoogleSheet>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly googleSheetsApiService: GoogleSheetsApiService,
    private readonly dataSource: DataSource,
  ) {}

  /** Настройка и ручной запуск синка меняют данные таблицы — нужны права редактора. */
  private async ensureCanEditCustomTables(userId: string, workspaceId: string): Promise<void> {
    await ensureCanEdit(
      this.workspaceMemberRepository,
      workspaceId,
      userId,
      'canEditCustomTables',
      'TABLES_EDIT_FORBIDDEN',
    );
  }

  /** Таблицы, у которых подошёл срок обновления. */
  async findDueTables(now: Date = new Date()): Promise<CustomTable[]> {
    const candidates = await this.tableRepository.find({
      where: { syncEnabled: true },
      take: 50,
    });
    return candidates.filter(table => {
      if (!table.lastSyncedAt) {
        return true;
      }
      const intervalMs = Math.max(table.syncIntervalHours || 24, 1) * 60 * 60 * 1000;
      return new Date(table.lastSyncedAt).getTime() + intervalMs <= now.getTime();
    });
  }

  /** Публичный доступ к таблице всегда проходит проверку воркспейса. */
  async assertTableInWorkspace(workspaceId: string, tableId: string): Promise<CustomTable> {
    const table = await this.tableRepository
      .createQueryBuilder('table')
      .leftJoin('table.user', 'owner')
      .where('table.id = :tableId', { tableId })
      .andWhere('owner.workspaceId = :workspaceId', { workspaceId })
      .getOne();
    if (!table) {
      throw new NotFoundException(appError('TABLE_NOT_FOUND'));
    }
    return table;
  }

  async updateSyncSettings(
    userId: string,
    workspaceId: string,
    tableId: string,
    dto: {
      syncEnabled?: boolean;
      syncIntervalHours?: number;
      syncConfig?: Record<string, unknown> | null;
    },
  ): Promise<CustomTable> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    const table = await this.assertTableInWorkspace(workspaceId, tableId);

    if (dto.syncConfig !== undefined) {
      table.syncConfig = dto.syncConfig;
    }
    if (dto.syncIntervalHours !== undefined) {
      table.syncIntervalHours = dto.syncIntervalHours;
    }
    if (dto.syncEnabled !== undefined) {
      // Включать синк без источника нельзя — иначе планировщик будет
      // бесконечно спотыкаться об одну и ту же таблицу.
      if (dto.syncEnabled && !(table.syncConfig as Record<string, unknown> | null)?.googleSheetId) {
        throw new BadRequestException(appError('SYNC_SOURCE_REQUIRED'));
      }
      table.syncEnabled = dto.syncEnabled;
    }

    return this.tableRepository.save(table);
  }

  /** Ручной запуск из UI: та же перезапись строк, что и по расписанию, но от имени пользователя. */
  async runUserSync(userId: string, workspaceId: string, tableId: string): Promise<SyncResult> {
    await this.ensureCanEditCustomTables(userId, workspaceId);
    await this.assertTableInWorkspace(workspaceId, tableId);
    return this.syncTable(tableId);
  }

  async syncTable(tableId: string): Promise<SyncResult> {
    const table = await this.tableRepository.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException(appError('TABLE_NOT_FOUND'));
    }
    const config = (table.syncConfig ?? {}) as Record<string, unknown>;
    const googleSheetId = config.googleSheetId;
    if (typeof googleSheetId !== 'string') {
      throw new BadRequestException(appError('SYNC_SOURCE_NOT_CONFIGURED'));
    }

    const sheet = await this.googleSheetRepository.findOne({ where: { id: googleSheetId } });
    if (!sheet) {
      throw new NotFoundException(appError('SHEETS_CONNECTION_NOT_FOUND'));
    }

    const worksheetName = typeof config.worksheetName === 'string' ? config.worksheetName : '';
    const range = typeof config.range === 'string' && config.range ? config.range : 'A:ZZ';
    const fullRange = worksheetName ? `${worksheetName}!${range}` : range;

    const { values } = await this.googleSheetsApiService.getValues(
      sheet.accessToken,
      sheet.refreshToken,
      sheet.sheetId,
      fullRange,
      { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
    );

    const columns = await this.columnRepository.find({
      where: { tableId },
      order: { position: 'ASC' },
    });
    if (!columns.length) {
      throw new BadRequestException(appError('TABLE_NO_COLUMNS'));
    }

    const matrix = Array.isArray(values) ? (values as unknown[][]) : [];
    // Первая строка листа — заголовки: они уже стали колонками при импорте.
    const dataRows = matrix.slice(1);

    const rows = dataRows.map((cells, index) => {
      const data: Record<string, unknown> = {};
      columns.forEach((col, position) => {
        const raw = Array.isArray(cells) ? cells[position] : undefined;
        data[col.key] = raw === null || raw === undefined ? '' : String(raw);
      });
      return { tableId, rowNumber: index + 1, data };
    });

    // Замена в одной транзакции: иначе сбой на вставке оставил бы таблицу пустой.
    await this.dataSource.transaction(async manager => {
      await manager.delete(CustomTableRow, { tableId });
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await manager.insert(CustomTableRow, rows.slice(i, i + chunkSize));
      }
    });

    const syncedAt = new Date();
    table.lastSyncedAt = syncedAt;
    table.lastSyncError = null;
    await this.tableRepository.save(table);

    this.logger.log(`Synced table ${tableId}: ${rows.length} rows`);
    return { rows: rows.length, syncedAt };
  }

  /** Ошибка одной таблицы не должна останавливать остальные. */
  async recordSyncFailure(tableId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.tableRepository.update(
      { id: tableId },
      { lastSyncError: message.slice(0, 500), lastSyncedAt: new Date() },
    );
  }
}
