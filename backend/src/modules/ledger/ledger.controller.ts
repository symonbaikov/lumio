import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import { EntityType } from '../../entities/audit-event.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import type { LedgerAccountResponseDto } from './dto/ledger-account-response.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { LedgerAccountsService } from './ledger-accounts.service';

/** Chart of accounts. */
@Controller('ledger/accounts')
export class LedgerController {
  constructor(private readonly accountsService: LedgerAccountsService) {}

  /** Flat list ordered by position; build the tree from `parentId`. Seeds the chart on first read. */
  @Get()
  @WorkspaceAuth(Permission.LEDGER_VIEW)
  async list(@WorkspaceId() workspaceId: string): Promise<LedgerAccountResponseDto[]> {
    return this.accountsService.list(workspaceId);
  }

  @Post()
  @WorkspaceAuth(Permission.LEDGER_MANAGE_ACCOUNTS)
  @Audit({ entityType: EntityType.LEDGER_ACCOUNT, includeDiff: true })
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    return this.accountsService.create(workspaceId, dto);
  }

  @Patch(':id')
  @WorkspaceAuth(Permission.LEDGER_MANAGE_ACCOUNTS)
  @Audit({ entityType: EntityType.LEDGER_ACCOUNT, includeDiff: true, includeBody: true })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    return this.accountsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.LEDGER_MANAGE_ACCOUNTS)
  @Audit({ entityType: EntityType.LEDGER_ACCOUNT })
  async remove(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.accountsService.remove(workspaceId, id);
    return deletedResponse('Ledger account');
  }
}
