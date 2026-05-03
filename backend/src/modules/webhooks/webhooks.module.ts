import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEndpoint } from '../../entities/webhook-endpoint.entity';
import { WebhookSubscription } from '../../entities/webhook-subscription.entity';
import { WebhookDelivery } from '../../entities/webhook-delivery.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { StatementsModule } from '../statements/statements.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { WebhookEndpointsService } from './services/webhook-endpoints.service';
import { WebhookSubscriptionsService } from './services/webhook-subscriptions.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { WebhookProcessorService } from './services/webhook-processor.service';
import { WebhookInboundService } from './webhook-inbound.service';
import { WebhookEventsListener } from './webhook-events.listener';
import { WebhookTokenGuard } from './guards/webhook-token.guard';
import { WebhookInboundController } from './webhook-inbound.controller';
import { WebhookEndpointsController } from './webhook-endpoints.controller';
import { WebhookSubscriptionsController } from './webhook-subscriptions.controller';
import { WebhookDeliveriesController } from './webhook-deliveries.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpoint, WebhookSubscription, WebhookDelivery, WorkspaceMember]),
    StatementsModule,
    ReceiptsModule,
  ],
  controllers: [
    WebhookInboundController,
    WebhookEndpointsController,
    WebhookSubscriptionsController,
    WebhookDeliveriesController,
  ],
  providers: [
    WebhookEndpointsService,
    WebhookSubscriptionsService,
    WebhookDeliveryService,
    WebhookDispatcherService,
    WebhookProcessorService,
    WebhookInboundService,
    WebhookEventsListener,
    WebhookTokenGuard,
  ],
})
export class WebhooksModule {}
