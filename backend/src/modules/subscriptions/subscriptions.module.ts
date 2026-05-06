import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Transaction } from '../../entities/transaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionDetectionService } from './subscription-detection.service';
import { SubscriptionEventsListener } from './subscription-events.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Transaction]), NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionDetectionService, SubscriptionEventsListener],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
