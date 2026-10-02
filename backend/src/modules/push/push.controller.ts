import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushSubscriptionDto, PushUnsubscribeDto } from './dto/push-subscription.dto';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /** Whether the server can push, and the key the browser subscribes with. */
  @Get('public-key')
  publicKey() {
    return { enabled: this.pushService.isEnabled(), publicKey: this.pushService.publicKey() };
  }

  @Get('subscriptions')
  async list(@CurrentUser() user: User) {
    const rows = await this.pushService.listForUser(user.id);
    return rows.map(row => ({
      id: row.id,
      endpoint: row.endpoint,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
    }));
  }

  @Post('subscriptions')
  async subscribe(@CurrentUser() user: User, @Body() dto: PushSubscriptionDto) {
    const row = await this.pushService.subscribe(user.id, dto);
    return { id: row.id, endpoint: row.endpoint };
  }

  @Delete('subscriptions')
  @HttpCode(204)
  async unsubscribe(@CurrentUser() user: User, @Body() dto: PushUnsubscribeDto) {
    await this.pushService.unsubscribe(user.id, dto.endpoint);
  }
}
