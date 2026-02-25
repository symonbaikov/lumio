import { Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { ActorType, EntityType, Severity } from '../../entities/audit-event.entity';
import { type User, UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@Controller('audit-events')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
@RequirePermission(Permission.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @WorkspaceId() workspaceIdFromContext: string,
    @Query('entityType') entityType?: EntityType,
    @Query('entityId') entityId?: string,
    @Query('actorType') actorType?: ActorType,
    @Query('actorId') actorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('batchId') batchId?: string,
    @Query('severity') severity?: Severity,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.auditService.findEvents({
      workspaceId: workspaceIdFromContext,
      entityType,
      entityId,
      actorType,
      actorId,
      dateFrom,
      dateTo,
      batchId,
      severity,
      page,
      limit,
    });
  }

  @Get('entity/:entityType/:entityId')
  async getByEntity(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.auditService.findEventsByEntity(entityType, entityId, workspaceId);
  }

  @Get('batch/:batchId')
  async getByBatch(@Param('batchId') batchId: string, @WorkspaceId() workspaceId: string) {
    return this.auditService.findEventsByBatch(batchId, workspaceId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.auditService.findEventById(id, workspaceId);
  }

  @Post(':id/rollback')
  async rollback(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can rollback audit events');
    }
    return this.auditService.rollback(id, user.id, workspaceId);
  }
}
