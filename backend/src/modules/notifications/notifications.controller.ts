import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findByRecipient(
      user.id,
      workspaceId,
      limit ? Number(limit) : 30,
      offset ? Number(offset) : 0,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User, @Query('workspaceId') workspaceId?: string) {
    const count = await this.notificationsService.getUnreadCount(user.id, workspaceId);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: User, @Body() dto: MarkReadDto) {
    const updated = await this.notificationsService.markAsRead(user.id, dto.ids);
    return { updated };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: User, @Query('workspaceId') workspaceId?: string) {
    const updated = await this.notificationsService.markAllAsRead(user.id, workspaceId);
    return { updated };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}
