import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomTableSyncService } from './custom-table-sync.service';

@Injectable()
export class CustomTableSyncScheduler {
  private readonly logger = new Logger(CustomTableSyncScheduler.name);
  /** Защита от наложения прогонов, если синк идёт дольше интервала тика. */
  private running = false;

  constructor(private readonly syncService: CustomTableSyncService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runDueSyncs(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous sync run is still in progress, skipping this tick');
      return;
    }
    this.running = true;
    try {
      const tables = await this.syncService.findDueTables();
      for (const table of tables) {
        try {
          await this.syncService.syncTable(table.id);
        } catch (error) {
          // Падение одной таблицы не должно останавливать остальные.
          this.logger.error(`Sync failed for table ${table.id}: ${String(error)}`);
          await this.syncService.recordSyncFailure(table.id, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
