import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { secretsMatch } from '../../../common/utils/secret-compare.util';

@Injectable()
export class GoogleSheetsWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedToken = request.headers['x-webhook-token'] || request.headers['x-webhook-secret'];
    const expectedToken = this.configService.get<string>('SHEETS_WEBHOOK_TOKEN');

    if (!expectedToken) {
      throw new UnauthorizedException('Sheets webhook token is not configured');
    }

    if (!secretsMatch(providedToken, expectedToken)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    return true;
  }
}
