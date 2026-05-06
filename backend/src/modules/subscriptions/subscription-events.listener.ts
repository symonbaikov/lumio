import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionDetectionService } from './subscription-detection.service';

@Injectable()
export class SubscriptionEventsListener {
  private readonly logger = new Logger(SubscriptionEventsListener.name);

  constructor(private readonly detectionService: SubscriptionDetectionService) {}

  @OnEvent('import.committed')
  async handleImportCommitted(payload: { workspaceId: string }): Promise<void> {
    this.logger.log(`Running subscription detection for workspace ${payload.workspaceId}`);
    await this.detectionService.runDetection(payload.workspaceId);
  }
}
