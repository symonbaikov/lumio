import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BudgetsService } from './budgets.service';

interface ImportCommittedEvent {
  workspaceId: string;
  actorId?: string;
  actorName?: string;
}

@Injectable()
export class BudgetEventsListener {
  private readonly logger = new Logger(BudgetEventsListener.name);

  constructor(private readonly budgetsService: BudgetsService) {}

  @OnEvent('import.committed')
  async handleImportCommitted(event: ImportCommittedEvent): Promise<void> {
    try {
      await this.budgetsService.checkBudgetAlerts(event.workspaceId);
    } catch (error) {
      this.logger.error(
        `Failed to check budget alerts for workspace ${event.workspaceId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
