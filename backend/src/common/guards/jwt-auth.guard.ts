import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';
import type { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private apiKeysService: ApiKeysService | null = null;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (apiKey) {
      return this.authenticateWithApiKey(apiKey, request);
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  private async authenticateWithApiKey(
    rawKey: string,
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    if (!this.apiKeysService) {
      const { ApiKeysService } = await import('../../modules/api-keys/api-keys.service');
      this.apiKeysService = this.moduleRef.get(ApiKeysService, { strict: false });
    }

    const apiKey = await this.apiKeysService.validate(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    request.user = apiKey.user as any;
    // Expose workspace id via header so WorkspaceContextGuard can pick it up
    if (!request.headers['x-workspace-id']) {
      request.headers['x-workspace-id'] = apiKey.workspaceId;
    }

    return true;
  }
}
