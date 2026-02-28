export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export const canAccessWorkspaceActivity = (role?: string | null) =>
  role === 'owner' || role === 'admin';
