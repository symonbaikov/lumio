import {
  WorkspaceMemberPermissions,
  WorkspaceRole,
} from '../../../entities/workspace-member.entity';

export class WorkspaceStatsDto {
  integrationCount: number;
  recentActivity: boolean;
  memberCount: number;
  lastAccessedAt: Date | null;
}

export class WorkspaceResponseDto {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  backgroundImage: string | null;
  currency: string | null;
  isFavorite: boolean;
  settings: Record<string, any> | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Member-specific data
  memberRole?: WorkspaceRole;
  memberPermissions?: WorkspaceMemberPermissions | null;

  // Statistics
  stats?: WorkspaceStatsDto;
}
