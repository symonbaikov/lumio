import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  ActorType,
  AuditAction,
  type AuditEventDiff,
  Severity,
} from '../../../entities/audit-event.entity';
import { AuditService } from '../audit.service';
import { AUDIT_METADATA_KEY, type AuditOptions } from '../decorators/audit.decorator';

interface AuditMetadata extends AuditOptions {
  entityType: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      params?: Record<string, string>;
      body?: any;
      user?: { id?: string };
      workspace?: { id?: string };
      headers?: Record<string, string | string[] | undefined>;
      path?: string;
    }>();

    const actorId = request.user?.id || null;
    const workspaceId = request.workspace?.id || (request.headers?.['x-workspace-id'] as string);
    const action = this.mapMethodToAction(request.method);
    const entityIdFromParams = request.params?.id || request.params?.entityId || null;
    const bodySnapshot = metadata.includeBody ? request.body : null;

    return next.handle().pipe(
      tap({
        next: response => {
          if (!action) return;
          const entityId =
            entityIdFromParams ||
            this.extractEntityId(response) ||
            this.extractEntityId(response?.data);

          if (!entityId) {
            this.logger.debug('Audit event skipped: entityId not resolved');
            return;
          }

          const diff: AuditEventDiff | null = metadata.includeDiff
            ? {
                before: bodySnapshot ?? null,
                after: response ?? null,
              }
            : null;

          // Audit: automatic controller-level event capture for annotated routes.
          void this.auditService
            .createEvent({
              workspaceId: workspaceId || null,
              actorType: ActorType.USER,
              actorId,
              entityType: metadata.entityType as any,
              entityId,
              action,
              diff,
              meta: {
                path: request.path,
                method: request.method,
              },
              severity: metadata.severity ?? Severity.INFO,
              isUndoable: metadata.isUndoable,
            })
            .catch(error => {
              this.logger.warn(`Audit event failed: ${error?.message || error}`);
            });
        },
      }),
    );
  }

  private mapMethodToAction(method?: string | null): AuditAction | null {
    switch ((method || '').toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return null;
    }
  }

  private extractEntityId(payload: any): string | null {
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.id === 'string') return payload.id;
    return null;
  }
}
