import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { WorkspaceMember } from '../../entities/workspace-member.entity';

@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        workspace?: any;
        user?: any;
        workspaceRole?: string;
        workspaceMemberPermissions?: any;
      }
    >();
    const workspaceId = request.headers['x-workspace-id'] as string;
    const user = request.user;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const membership = await this.dataSource.getRepository(WorkspaceMember).findOne({
      where: { workspaceId, userId: user.id },
      relations: ['workspace'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    request.workspace = membership.workspace;
    request.workspaceRole = membership.role;
    request.workspaceMemberPermissions = membership.permissions;

    return true;
  }
}
