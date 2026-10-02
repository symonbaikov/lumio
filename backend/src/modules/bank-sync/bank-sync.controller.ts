import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BankSyncService } from './bank-sync.service';
import { ConnectBankSyncDto, UpdateBankSyncSettingsDto } from './dto/bank-sync.dto';

@Controller('integrations/simplefin')
export class BankSyncController {
  constructor(private readonly bankSyncService: BankSyncService) {}

  @Get('status')
  @UseGuards(WorkspaceContextGuard)
  status(@WorkspaceId() workspaceId: string) {
    return this.bankSyncService.status(workspaceId);
  }

  @Post('connect')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  connect(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() body: ConnectBankSyncDto,
  ) {
    return this.bankSyncService.connect(user, workspaceId, body.setupToken);
  }

  @Post('settings')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  updateSettings(@WorkspaceId() workspaceId: string, @Body() body: UpdateBankSyncSettingsDto) {
    return this.bankSyncService.updateSettings(workspaceId, body);
  }

  @Post('accounts/refresh')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  refreshAccounts(@WorkspaceId() workspaceId: string) {
    return this.bankSyncService.refreshAccounts(workspaceId);
  }

  @Post('sync')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  sync(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.bankSyncService.sync(user, workspaceId);
  }

  @Delete()
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  disconnect(@WorkspaceId() workspaceId: string) {
    return this.bankSyncService.disconnect(workspaceId);
  }
}
