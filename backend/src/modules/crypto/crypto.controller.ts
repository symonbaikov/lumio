import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CryptoService } from './crypto.service';
import { ConnectCryptoWalletDto } from './dto/connect-crypto-wallet.dto';

@Controller('crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Get('wallets')
  @WorkspaceAuth(Permission.WALLET_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.cryptoService.findAll(workspaceId);
  }

  @Get('summary')
  @WorkspaceAuth(Permission.WALLET_VIEW)
  async getSummary(@WorkspaceId() workspaceId: string, @Query('days') days?: string) {
    const parsed = Number.parseInt(days ?? '', 10);
    return this.cryptoService.getSummary(
      workspaceId,
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30,
    );
  }

  @Post('wallets')
  @WorkspaceAuth(Permission.WALLET_CREATE)
  async connect(
    @Body() dto: ConnectCryptoWalletDto,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.cryptoService.connect(workspaceId, user.id, dto);
  }

  // Each sync fans out to a rate-limited block explorer and a price API, so the
  // manual refresh button gets a tighter budget than an ordinary endpoint.
  @Post('wallets/:id/sync')
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @WorkspaceAuth(Permission.WALLET_EDIT)
  async sync(@Param('id', ParseUUIDPipe) id: string, @WorkspaceId() workspaceId: string) {
    return this.cryptoService.sync(workspaceId, id);
  }

  @Delete('wallets/:id')
  @WorkspaceAuth(Permission.WALLET_DELETE)
  async remove(@Param('id', ParseUUIDPipe) id: string, @WorkspaceId() workspaceId: string) {
    await this.cryptoService.remove(workspaceId, id);
    return { success: true };
  }
}
