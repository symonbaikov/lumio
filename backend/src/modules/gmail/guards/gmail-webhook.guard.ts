import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class GmailWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GmailWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Get authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid authorization header');
      throw new UnauthorizedException('Invalid webhook authentication');
    }

    const token = authHeader.substring(7);

    // Verify token (in production, this should be a JWT from Google Cloud Pub/Sub)
    const expectedToken = process.env.PUBSUB_WEBHOOK_TOKEN || '';

    if (!expectedToken) {
      // Fail-safe default: без настроенного токена публичный вебхук открыт всем.
      // Пропускаем только вне production (см. .claude/rules/security.md §3).
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('PUBSUB_WEBHOOK_TOKEN not configured — allowing in non-production only');
        return true;
      }
      this.logger.error('PUBSUB_WEBHOOK_TOKEN not configured in production — rejecting webhook');
      throw new UnauthorizedException('Invalid webhook authentication');
    }

    if (token !== expectedToken) {
      this.logger.warn('Invalid webhook token');
      throw new UnauthorizedException('Invalid webhook authentication');
    }

    return true;
  }
}
