import { Injectable, Logger } from '@nestjs/common';
import { WebhookSubscriptionsService } from './webhook-subscriptions.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookEvent } from '../../../entities/webhook-subscription.entity';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly subscriptionsService: WebhookSubscriptionsService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  async dispatch(
    workspaceId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const subscriptions = await this.subscriptionsService.findActiveByWorkspaceAndEvent(workspaceId, event);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await this.deliveryService.enqueue(sub.id, event, payload);
        } catch (err) {
          this.logger.error(`Failed to enqueue delivery for subscription ${sub.id}`, err);
        }
      }),
    );
  }
}
