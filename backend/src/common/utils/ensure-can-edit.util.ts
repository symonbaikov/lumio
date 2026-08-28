import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type {
  WorkspaceMember,
  WorkspaceMemberPermissions,
} from '../../entities/workspace-member.entity';
import { WorkspaceRole } from '../../entities/workspace-member.entity';
import { type ErrorCode, appError } from '../errors/app-error';

/**
 * Checks that the given user has permission to perform an edit operation in the workspace.
 * Admins and Owners always pass. Members fail only if the specific permission is explicitly set to false.
 */
export async function ensureCanEdit(
  workspaceMemberRepository: Repository<WorkspaceMember>,
  workspaceId: string,
  userId: string,
  permissionKey: keyof WorkspaceMemberPermissions,
  errorCode: ErrorCode,
): Promise<void> {
  if (!workspaceId) {
    return;
  }

  const membership = await workspaceMemberRepository.findOne({
    where: { workspaceId, userId },
    select: ['role', 'permissions'],
  });

  if (!membership) {
    return;
  }
  if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) {
    return;
  }
  if (membership.permissions?.[permissionKey] === false) {
    throw new ForbiddenException(appError(errorCode));
  }
}
