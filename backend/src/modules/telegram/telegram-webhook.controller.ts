import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { TelegramService, type TelegramUpdatePayload } from './telegram.service';
import { TelegramWebhookGuard } from './telegram-webhook.guard';

@Controller('telegram/webhook')
export class TelegramWebhookController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post()
  @Public()
  @UseGuards(TelegramWebhookGuard)
  @HttpCode(200)
  async handleUpdate(@Body() update: TelegramUpdatePayload) {
    await this.telegramService.handleUpdate(update);
    return { ok: true };
  }
}
