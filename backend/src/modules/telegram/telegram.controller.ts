import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConnectTelegramDto } from './dto/connect-telegram.dto';
import { SendTelegramReportDto } from './dto/send-report.dto';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('connect')
  @WorkspaceAuth(Permission.TELEGRAM_CONNECT)
  async connect(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ConnectTelegramDto,
  ) {
    const updated = await this.telegramService.connectAccount(user, workspaceId, dto);
    return {
      userId: updated.id,
      telegramId: updated.telegramId,
      telegramChatId: updated.telegramChatId,
    };
  }

  @Get('reports')
  @WorkspaceAuth(Permission.TELEGRAM_VIEW)
  async listReports(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const currentPage = page ? Number.parseInt(page, 10) : 1;
    const pageSize = limit ? Number.parseInt(limit, 10) : 20;
    return this.telegramService.listReports(user, currentPage, pageSize);
  }

  @Post('send-report')
  @WorkspaceAuth(Permission.TELEGRAM_SEND)
  async sendReport(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: SendTelegramReportDto,
  ) {
    return this.telegramService.sendReport(user, dto, workspaceId);
  }
}
