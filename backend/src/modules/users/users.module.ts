import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimezonesService } from '../../common/services/timezones.service';
import { User } from '../../entities/user.entity';
import { AuthSession } from '../../entities/auth-session.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { Workspace } from '../../entities/workspace.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { PermissionsService } from './services/permissions.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Workspace, WorkspaceMember, AuthSession]), WorkspacesModule],
  controllers: [UsersController],
  providers: [UsersService, PermissionsService, TimezonesService],
  exports: [UsersService, PermissionsService, TimezonesService],
})
export class UsersModule {}
