import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Notification,
  NotificationPreference,
  WorkspaceMember,
} from '../../entities';
import { NotificationEventsListener } from './notification-events.listener';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference, WorkspaceMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_ACCESS_SECRET') || configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT secret is required for notifications gateway');
        }
        return { secret };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationEventsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
