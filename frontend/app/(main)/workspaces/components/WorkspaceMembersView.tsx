'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Send as SendIcon } from '@/app/components/icons';
import { ChevronDown, MailPlus, MoreHorizontal, Search, Users } from '@/app/components/icons';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  type MemberRoleFilter,
  type MemberSortBy,
  filterAndSortMembers,
} from './workspace-members.utils';
import { tokens } from '@/lib/theme-tokens';

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

type WorkspaceOverview = {
  workspace: { id: string; name: string; ownerId?: string | null; createdAt?: string };
  members: Array<{
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string | null;
    timeZone?: string | null;
    role: WorkspaceRole;
    permissions?: {
      canEditStatements?: boolean;
      canEditCustomTables?: boolean;
      canEditCategories?: boolean;
      canEditDataEntry?: boolean;
      canShareFiles?: boolean;
    } | null;
    joinedAt?: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: WorkspaceRole;
    permissions?: {
      canEditStatements?: boolean;
      canEditCustomTables?: boolean;
      canEditCategories?: boolean;
      canEditDataEntry?: boolean;
      canShareFiles?: boolean;
    } | null;
    status: string;
    token: string;
    expiresAt?: string;
    createdAt?: string;
    link?: string;
  }>;
};

type InvitePermissions = {
  canEditStatements: boolean;
  canEditCustomTables: boolean;
  canEditCategories: boolean;
  canEditDataEntry: boolean;
  canShareFiles: boolean;
};

const INVITATION_EXPIRY_DAYS = 7;
const ALL_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];

const SORT_OPTIONS: Array<{ key: MemberSortBy; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'joinedAt', label: 'Date added' },
];

const ROLE_FILTER_OPTIONS: Array<{ key: MemberRoleFilter; label: string }> = [
  { key: 'all', label: 'All roles' },
  { key: 'owner', label: 'Owner' },
  { key: 'admin', label: 'Admin' },
  { key: 'viewer', label: 'Viewer' },
  { key: 'member', label: 'Member' },
];

const PERMISSION_LABELS: Record<keyof InvitePermissions, string> = {
  canEditStatements: 'Statements',
  canEditCustomTables: 'Tables',
  canEditCategories: 'Categories',
  canEditDataEntry: 'Data entry',
  canShareFiles: 'File sharing & access',
};

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  owner: { bg: 'rgba(var(--primary-rgb,22,129,24),0.1)', color: 'var(--primary)', border: 'rgba(var(--primary-rgb,22,129,24),0.2)' },
  admin: { bg: 'var(--color-info-soft-bg)', color: 'var(--color-info-soft-text)', border: 'var(--color-info-soft-border)' },
  member: { bg: 'var(--muted)', color: 'var(--foreground)', border: 'var(--border-color)' },
  viewer: { bg: 'var(--muted)', color: 'var(--foreground)', border: 'var(--border-color)' },
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_TOOLTIPS: Record<string, string> = {
  owner: 'Full workspace control, including ownership transfer and member management.',
  admin: 'Can invite and manage non-owner members.',
  member: 'Can work with workspace data based on assigned permissions.',
  viewer: 'Read-only access to workspace content.',
};

const getInitials = (value?: string) =>
  (value || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

const getApiMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== 'object') return fallback;
  const response = (err as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? fallback;
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getRoleLabel = (role: string) => ROLE_LABELS[role] || role;

export default function WorkspaceMembersView() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>('all');
  const [sortBy, setSortBy] = useState<MemberSortBy>('name');
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const [memberMenuAnchorMap, setMemberMenuAnchorMap] = useState<Record<string, HTMLElement | null>>({});
  const [roleMenuAnchorMap, setRoleMenuAnchorMap] = useState<Record<string, HTMLElement | null>>({});
  const [invitePermissions, setInvitePermissions] = useState<InvitePermissions>({
    canEditStatements: true,
    canEditCustomTables: true,
    canEditCategories: true,
    canEditDataEntry: true,
    canShareFiles: false,
  });

  const currentMembership = useMemo(
    () => overview?.members.find(item => item.id === user?.id),
    [overview?.members, user?.id],
  );

  const isOwnerOrAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';
  const isWorkspaceOwner = currentMembership?.role === 'owner';

  const visibleMembers = useMemo(
    () =>
      filterAndSortMembers(overview?.members || [], {
        searchEmail,
        roleFilter,
        sortBy,
      }),
    [overview?.members, roleFilter, searchEmail, sortBy],
  );

  const loadOverview = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await apiClient.get<WorkspaceOverview>('/workspaces/me');
      setOverview(response.data);
    } catch (err) {
      setFetchError(getApiMessage(err, 'Failed to load workspace members'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const canRemoveMember = (member: WorkspaceOverview['members'][number]) => {
    if (!overview) return false;
    if (!isOwnerOrAdmin) return false;
    if (member.role === 'owner') return false;
    if (member.id === user?.id) return false;

    if (overview.workspace.ownerId === user?.id) {
      return true;
    }

    return member.role === 'member' || member.role === 'viewer';
  };

  const getAllowedRoleTargets = (member: WorkspaceOverview['members'][number]): WorkspaceRole[] => {
    if (!isOwnerOrAdmin) return [];
    if (member.id === user?.id) return [];

    if (isWorkspaceOwner) {
      return ALL_ROLES;
    }

    if (member.role === 'owner' || member.role === 'admin') {
      return [];
    }

    return ['member', 'viewer'];
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!overview?.workspace.id) return;

    setInviteLoading(true);
    try {
      await apiClient.post(`/workspaces/${overview.workspace.id}/invitations`, {
        email: inviteEmail,
        role: inviteRole,
        permissions: inviteRole === 'member' ? invitePermissions : undefined,
      });

      setInviteEmail('');
      toast.success('Invitation sent');
      await loadOverview();
    } catch (err) {
      toast.error(getApiMessage(err, 'Failed to send invitation'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleChangeMemberRole = async (
    member: WorkspaceOverview['members'][number],
    nextRole: WorkspaceRole,
  ) => {
    if (!overview?.workspace.id) return;
    if (member.role === nextRole) return;

    const affectsOwnerRole = member.role === 'owner' || nextRole === 'owner';
    if (
      affectsOwnerRole &&
      !window.confirm('This change affects Owner role. Confirm role update before continuing.')
    ) {
      return;
    }

    setUpdatingRoleMemberId(member.id);
    try {
      await apiClient.patch(`/workspaces/${overview.workspace.id}/members/${member.id}/role`, {
        role: nextRole,
      });
      toast.success('Role updated');
      await loadOverview();
    } catch (err) {
      toast.error(getApiMessage(err, 'Failed to update role'));
    } finally {
      setUpdatingRoleMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!overview?.workspace.id) return;

    setRemovingMemberId(memberId);
    try {
      await apiClient.delete(`/workspaces/${overview.workspace.id}/members/${memberId}`);
      toast.success('Member removed');
      await loadOverview();
    } catch (err) {
      toast.error(getApiMessage(err, 'Failed to remove member'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleResendInvitation = async (invite: WorkspaceOverview['invitations'][number]) => {
    if (!overview?.workspace.id) return;

    setResendingInvitationId(invite.id);
    try {
      await apiClient.post(`/workspaces/${overview.workspace.id}/invitations`, {
        email: invite.email,
        role: invite.role,
        permissions: invite.role === 'member' ? invite.permissions : undefined,
      });
      toast.success('Invitation resent');
      await loadOverview();
    } catch (err) {
      toast.error(getApiMessage(err, 'Failed to resend invitation'));
    } finally {
      setResendingInvitationId(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!overview?.workspace.id) return;
    if (!window.confirm('Revoke this invitation?')) return;

    setRevokingInvitationId(invitationId);
    try {
      await apiClient.delete(`/workspaces/${overview.workspace.id}/invitations/${invitationId}`);
      toast.success('Invitation revoked');
      await loadOverview();
    } catch (err) {
      toast.error(getApiMessage(err, 'Failed to revoke invitation'));
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const handleMemberMenuAction = async (
    member: WorkspaceOverview['members'][number],
    action: string,
  ) => {
    if (action === 'remove') {
      if (!window.confirm('Remove this member from workspace?')) return;
      await handleRemoveMember(member.id);
      return;
    }

    if (!action.startsWith('role:')) return;

    const role = action.replace('role:', '') as WorkspaceRole;
    await handleChangeMemberRole(member, role);
  };

  const copyInviteLink = async (token: string, providedLink?: string) => {
    try {
      const link = providedLink || `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: 'calc(100vh - var(--global-nav-height, 0px))', overflowY: 'auto', bgcolor: 'var(--background)' }}>
        <Box sx={{ maxWidth: 1024, px: 3, py: 4 }}>
          <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 3, fontSize: 14, color: 'var(--muted-foreground)' }}>
            Loading members...
          </Box>
        </Box>
      </Box>
    );
  }

  if (!overview) {
    return (
      <Box sx={{ height: 'calc(100vh - var(--global-nav-height, 0px))', overflowY: 'auto', bgcolor: 'var(--background)' }}>
        <Box sx={{ maxWidth: 1024, px: 3, py: 4 }}>
          <Box sx={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: tokens.radius.lg, bgcolor: 'var(--color-error-soft-bg)', p: 3, fontSize: 14, color: 'var(--destructive)' }}>
            {fetchError || 'Failed to load workspace members'}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - var(--global-nav-height, 0px))', overflowY: 'auto', bgcolor: 'var(--background)' }}>
      <Box sx={{ maxWidth: 1024, px: 3, py: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Header */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Users size={20} style={{ color: 'var(--foreground)' }} />
                <Typography variant="h5" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                  Members
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
                {overview.members.length} total member{overview.members.length === 1 ? '' : 's'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowInviteForm(prev => !prev)}
              startIcon={<MailPlus size={16} />}
            >
              Invite member
            </Button>
          </Box>
        </Box>

        {/* Invite form */}
        {showInviteForm && (
          <Box
            component="form"
            onSubmit={handleInvite}
            sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {/* Email */}
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <label
                  htmlFor="invite-email"
                  style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}
                >
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  required
                  disabled={!isOwnerOrAdmin}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--foreground)',
                    borderRadius: tokens.radius.md,
                    boxSizing: 'border-box',
                    opacity: !isOwnerOrAdmin ? 0.6 : 1,
                    cursor: !isOwnerOrAdmin ? 'not-allowed' : 'auto',
                  }}
                />
              </Box>

              {/* Role */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <label
                  htmlFor="invite-role"
                  style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}
                >
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={event => setInviteRole(event.target.value as WorkspaceRole)}
                  disabled={!isOwnerOrAdmin}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--foreground)',
                    borderRadius: tokens.radius.md,
                    opacity: !isOwnerOrAdmin ? 0.6 : 1,
                    cursor: !isOwnerOrAdmin ? 'not-allowed' : 'auto',
                  }}
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </Box>
            </Box>

            {/* Permissions */}
            {inviteRole === 'member' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--foreground)' }}>
                  Access permissions
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof InvitePermissions>).map(key => (
                    <Box key={key} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 14, color: 'var(--foreground)' }}>
                      <Checkbox
                        checked={invitePermissions[key]}
                        onCheckedChange={checked =>
                          setInvitePermissions(prev => ({
                            ...prev,
                            [key]: checked,
                          }))
                        }
                        disabled={!isOwnerOrAdmin}
                      />
                      {PERMISSION_LABELS[key]}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {!isOwnerOrAdmin && (
              <Box sx={{ border: '1px solid #fbbf24', bgcolor: 'var(--color-warning-soft-bg)', p: 1.5, fontSize: 14, color: 'var(--color-warning-soft-text)', borderRadius: tokens.radius.md }}>
                Only owner or admin can invite new members.
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={!isOwnerOrAdmin || inviteLoading}
                startIcon={<SendIcon size={16} />}
              >
                {inviteLoading ? 'Sending...' : 'Send invitation'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Search & Filter */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <TextField
              aria-label="Search members by email"
              placeholder="Search by email"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              size="small"
              variant="outlined"
              sx={{ width: { xs: '100%', sm: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} style={{ color: 'var(--muted-foreground)' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={e => setSortMenuAnchor(e.currentTarget)}
              endIcon={<ChevronDown size={14} />}
              sx={{ minWidth: 160, justifyContent: 'space-between' }}
            >
              Sort: {SORT_OPTIONS.find(option => option.key === sortBy)?.label || 'Name'}
            </Button>
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={() => setSortMenuAnchor(null)}
              aria-label="Member sorting"
            >
              {SORT_OPTIONS.map(option => (
                <MenuItem
                  key={option.key}
                  selected={option.key === sortBy}
                  onClick={() => { setSortBy(option.key); setSortMenuAnchor(null); }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              size="small"
              onClick={e => setRoleMenuAnchor(e.currentTarget)}
              endIcon={<ChevronDown size={14} />}
              sx={{ minWidth: 180, justifyContent: 'space-between' }}
            >
              Role:{' '}
              {ROLE_FILTER_OPTIONS.find(option => option.key === roleFilter)?.label || 'All roles'}
            </Button>
            <Menu
              anchorEl={roleMenuAnchor}
              open={Boolean(roleMenuAnchor)}
              onClose={() => setRoleMenuAnchor(null)}
              aria-label="Member role filter"
            >
              {ROLE_FILTER_OPTIONS.map(option => (
                <MenuItem
                  key={option.key}
                  selected={option.key === roleFilter}
                  onClick={() => { setRoleFilter(option.key); setRoleMenuAnchor(null); }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
            Showing {visibleMembers.length} of {overview.members.length} members.
          </Typography>
        </Box>

        {/* Members list */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibleMembers.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
              No members match current filters.
            </Typography>
          ) : (
            visibleMembers.map(member => {
              const canRemove = canRemoveMember(member);
              const roleTargets = getAllowedRoleTargets(member);
              const canManageRole = roleTargets.length > 0;
              const roleUpdating = updatingRoleMemberId === member.id;
              const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.member;

              return (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    border: '1px solid var(--border)',
                    borderRadius: tokens.radius.md,
                    bgcolor: 'var(--background)',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  {/* Avatar + info */}
                  <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        overflow: 'hidden',
                        borderRadius: tokens.radius.full,
                        bgcolor: 'rgba(var(--primary-rgb,22,129,24),0.1)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {normalizeAvatarUrl(member.avatarUrl) ? (
                        <img
                          src={normalizeAvatarUrl(member.avatarUrl) as string}
                          alt={member.name || member.email || 'Member avatar'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(member.name || member.email)
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.name || member.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Timezone: {member.timeZone || 'Auto'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Role + actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={ROLE_TOOLTIPS[member.role] || 'Workspace role'} placement="top">
                      <span>
                        {canManageRole ? (
                          <>
                            <button
                              type="button"
                              disabled={roleUpdating}
                              onClick={e => setRoleMenuAnchorMap(prev => ({ ...prev, [member.id]: e.currentTarget }))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                borderRadius: tokens.radius.sm,
                                border: `1px solid ${roleStyle.border}`,
                                background: roleStyle.bg,
                                color: roleStyle.color,
                                padding: '2px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                opacity: roleUpdating ? 0.6 : 1,
                              }}
                            >
                              {roleUpdating ? 'Updating...' : getRoleLabel(member.role)}
                              <ChevronDown size={12} />
                            </button>
                            <Menu
                              anchorEl={roleMenuAnchorMap[member.id]}
                              open={Boolean(roleMenuAnchorMap[member.id])}
                              onClose={() => setRoleMenuAnchorMap(prev => ({ ...prev, [member.id]: null }))}
                              aria-label={`Change role for ${member.email || member.id}`}
                            >
                              {roleTargets.map(role => (
                                <MenuItem
                                  key={role}
                                  disabled={role === member.role}
                                  onClick={() => {
                                    setRoleMenuAnchorMap(prev => ({ ...prev, [member.id]: null }));
                                    void handleChangeMemberRole(member, role);
                                  }}
                                >
                                  {getRoleLabel(role)}
                                </MenuItem>
                              ))}
                            </Menu>
                          </>
                        ) : (
                          <span
                            style={{
                              borderRadius: tokens.radius.sm,
                              border: `1px solid ${roleStyle.border}`,
                              background: roleStyle.bg,
                              color: roleStyle.color,
                              padding: '2px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                        )}
                      </span>
                    </Tooltip>

                    <IconButton
                      size="small"
                      aria-label={`Actions for ${member.email || member.id}`}
                      onClick={e => setMemberMenuAnchorMap(prev => ({ ...prev, [member.id]: e.currentTarget }))}
                    >
                      <MoreHorizontal size={16} />
                    </IconButton>
                    <Menu
                      anchorEl={memberMenuAnchorMap[member.id]}
                      open={Boolean(memberMenuAnchorMap[member.id])}
                      onClose={() => setMemberMenuAnchorMap(prev => ({ ...prev, [member.id]: null }))}
                      aria-label={`Member actions for ${member.email || member.id}`}
                    >
                      {canManageRole && roleTargets.map(role => (
                        <MenuItem
                          key={`role:${role}`}
                          disabled={role === member.role}
                          onClick={() => {
                            setMemberMenuAnchorMap(prev => ({ ...prev, [member.id]: null }));
                            void handleMemberMenuAction(member, `role:${role}`);
                          }}
                        >
                          Set as {getRoleLabel(role)}
                        </MenuItem>
                      ))}
                      <MenuItem
                        disabled={!canRemove || removingMemberId === member.id}
                        onClick={() => {
                          setMemberMenuAnchorMap(prev => ({ ...prev, [member.id]: null }));
                          void handleMemberMenuAction(member, 'remove');
                        }}
                        sx={{ color: 'error.main' }}
                      >
                        {removingMemberId === member.id ? 'Removing...' : 'Remove from workspace'}
                      </MenuItem>
                    </Menu>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Pending invitations */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}
          >
            Pending invitations
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
            Invitations expire in {INVITATION_EXPIRY_DAYS} days.
          </Typography>

          {overview.invitations.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
              No active invitations. New invites will appear here with resend and revoke actions.
            </Typography>
          ) : (
            overview.invitations.map(invite => {
              const isResending = resendingInvitationId === invite.id;
              const isRevoking = revokingInvitationId === invite.id;
              const isActionBusy = isResending || isRevoking;

              return (
                <Box
                  key={invite.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    border: '1px dashed var(--border)',
                    borderRadius: tokens.radius.md,
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--foreground)' }}>
                      {invite.email}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block' }}>
                      Role: {getRoleLabel(invite.role)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block' }}>
                      Invited {formatDate(invite.createdAt)} · Expires {formatDate(invite.expiresAt)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!isOwnerOrAdmin || isActionBusy}
                      onClick={() => void handleResendInvitation(invite)}
                    >
                      {isResending ? 'Sending...' : 'Resend'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={!isOwnerOrAdmin || isActionBusy}
                      onClick={() => void handleRevokeInvitation(invite.id)}
                    >
                      {isRevoking ? 'Revoking...' : 'Revoke'}
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      disabled={isActionBusy}
                      onClick={() => void copyInviteLink(invite.token, invite.link)}
                    >
                      Copy link
                    </Button>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
