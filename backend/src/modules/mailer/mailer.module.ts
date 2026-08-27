import { Module } from '@nestjs/common';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { MailerService } from './mailer.service';

@Module({
  imports: [ApplicationSettingsModule],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
