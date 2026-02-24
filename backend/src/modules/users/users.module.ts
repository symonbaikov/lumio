import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimezonesService } from '../../common/services/timezones.service';
import { User } from '../../entities/user.entity';
import { Workspace } from '../../entities/workspace.entity';
import { PermissionsService } from './services/permissions.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Workspace])],
  controllers: [UsersController],
  providers: [UsersService, PermissionsService, TimezonesService],
  exports: [UsersService, PermissionsService, TimezonesService],
})
export class UsersModule {}
