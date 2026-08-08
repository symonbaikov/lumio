import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type User, UserRole } from '../../entities/user.entity';
import {
  type WorkspaceMemberPermissions,
  WorkspaceRole,
} from '../../entities/workspace-member.entity';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { Permission } from '../enums/permissions.enum';
import { Permission as PermissionEnum, ROLE_PERMISSIONS } from '../enums/permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get user permissions (custom or role-based)
    const userPermissions = this.getUserPermissions(user);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );

    if (hasAllPermissions) {
      return true;
    }

    const workspaceRole = request.workspaceRole as WorkspaceRole | undefined;
    const workspaceMemberPermissions = request.workspaceMemberPermissions as
      | WorkspaceMemberPermissions
      | null
      | undefined;

    if (
      this.hasWorkspacePermission(requiredPermissions, workspaceRole, workspaceMemberPermissions)
    ) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }

  private getUserPermissions(user: User): Permission[] {
    // If user has custom permissions, use them
    if (user.permissions && user.permissions.length > 0) {
      return this.withAuditAliases(user.permissions as Permission[]);
    }

    // Otherwise, use role-based permissions
    return this.withAuditAliases(ROLE_PERMISSIONS[user.role] || []);
  }

  private withAuditAliases(permissions: Permission[]): Permission[] {
    const normalized = new Set(permissions);
    if (normalized.has(PermissionEnum.AUDIT_LOG_VIEW)) {
      normalized.add(PermissionEnum.AUDIT_VIEW);
    }
    if (normalized.has(PermissionEnum.AUDIT_VIEW)) {
      normalized.add(PermissionEnum.AUDIT_LOG_VIEW);
    }
    return Array.from(normalized);
  }

  private hasWorkspacePermission(
    requiredPermissions: Permission[],
    workspaceRole?: WorkspaceRole,
    workspaceMemberPermissions?: WorkspaceMemberPermissions | null,
  ): boolean {
    if (!workspaceRole) {
      return false;
    }

    const hasAuditPermission = requiredPermissions.every(permission =>
      [PermissionEnum.AUDIT_VIEW, PermissionEnum.AUDIT_LOG_VIEW].includes(permission),
    );

    if (hasAuditPermission) {
      return [WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(workspaceRole);
    }

    const statementPermissions = new Set<Permission>([
      PermissionEnum.STATEMENT_UPLOAD,
      PermissionEnum.STATEMENT_EDIT,
      PermissionEnum.STATEMENT_DELETE,
      PermissionEnum.TRANSACTION_EDIT,
      PermissionEnum.TRANSACTION_DELETE,
      PermissionEnum.TRANSACTION_BULK_UPDATE,
    ]);

    const isStatementPermission = requiredPermissions.every(permission =>
      statementPermissions.has(permission),
    );

    if (isStatementPermission) {
      if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(workspaceRole)) {
        return true;
      }
      if (workspaceMemberPermissions?.canEditStatements === false) {
        return false;
      }
      return true;
    }

    // Workspace owners/admins manage these workspace-scoped resources
    // (budgets, wallets, payables, categories, branches, subscriptions)
    // even if their global user role only grants view access.
    const workspaceManagedPermissions = new Set<Permission>([
      PermissionEnum.BUDGET_CREATE,
      PermissionEnum.BUDGET_EDIT,
      PermissionEnum.BUDGET_DELETE,
      PermissionEnum.WALLET_CREATE,
      PermissionEnum.WALLET_EDIT,
      PermissionEnum.WALLET_DELETE,
      PermissionEnum.PAYABLE_CREATE,
      PermissionEnum.PAYABLE_EDIT,
      PermissionEnum.PAYABLE_DELETE,
      PermissionEnum.CATEGORY_CREATE,
      PermissionEnum.CATEGORY_EDIT,
      PermissionEnum.CATEGORY_DELETE,
      PermissionEnum.BRANCH_CREATE,
      PermissionEnum.BRANCH_EDIT,
      PermissionEnum.BRANCH_DELETE,
      PermissionEnum.SUBSCRIPTION_CREATE,
      PermissionEnum.SUBSCRIPTION_EDIT,
      PermissionEnum.SUBSCRIPTION_DELETE,
    ]);

    const isWorkspaceManagedPermission = requiredPermissions.every(permission =>
      workspaceManagedPermissions.has(permission),
    );

    if (isWorkspaceManagedPermission) {
      return [WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(workspaceRole);
    }

    return false;
  }
}
