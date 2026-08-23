import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimezonesService } from '../../common/services/timezones.service';
import { AuditEvent } from '../../entities/audit-event.entity';
import { AuthSession } from '../../entities/auth-session.entity';
import { NotificationPreference } from '../../entities/notification-preference.entity';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { Workspace } from '../../entities/workspace.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AccountDataService } from './services/account-data.service';
import { PermissionsService } from './services/permissions.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Workspace,
      WorkspaceMember,
      AuthSession,
      NotificationPreference,
      Notification,
      AuditEvent,
    ]),
    WorkspacesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, PermissionsService, TimezonesService, AccountDataService],
  exports: [UsersService, PermissionsService, TimezonesService],
})
export class UsersModule {}
