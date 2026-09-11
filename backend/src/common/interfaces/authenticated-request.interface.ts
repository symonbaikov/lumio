import type { Request } from 'express';
import type { Workspace } from '../../entities/workspace.entity';
import type {
  WorkspaceMemberPermissions,
  WorkspaceRole,
} from '../../entities/workspace-member.entity';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  workspace?: Workspace;
  workspaceRole?: WorkspaceRole;
  workspaceMemberPermissions?: WorkspaceMemberPermissions | null;
  apiKeyWorkspaceId?: string;
  requestId?: string;
  traceId?: string;
}
