'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Input,
} from '@heroui/react';
import { Tooltip } from '@heroui/tooltip';
import SendIcon from '@mui/icons-material/Send';
import { ChevronDown, MailPlus, MoreHorizontal, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  type MemberRoleFilter,
  type MemberSortBy,
  filterAndSortMembers,
} from './workspace-members.utils';

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

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  admin: 'bg-sky-50 text-sky-700 border-sky-200',
  member: 'bg-gray-50 text-gray-700 border-gray-200',
  viewer: 'bg-gray-50 text-gray-700 border-gray-200',
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

const getApiMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;

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
    } catch (error) {
      setFetchError(getApiMessage(error, 'Failed to load workspace members'));
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
    } catch (error) {
      toast.error(getApiMessage(error, 'Failed to send invitation'));
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
    } catch (error) {
      toast.error(getApiMessage(error, 'Failed to update role'));
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
    } catch (error) {
      toast.error(getApiMessage(error, 'Failed to remove member'));
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
    } catch (error) {
      toast.error(getApiMessage(error, 'Failed to resend invitation'));
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
    } catch (error) {
      toast.error(getApiMessage(error, 'Failed to revoke invitation'));
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
      <div className="h-[calc(100vh-var(--global-nav-height,0px))] overflow-y-auto bg-background">
        <div className="container max-w-5xl px-6 py-8">
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading members...
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="h-[calc(100vh-var(--global-nav-height,0px))] overflow-y-auto bg-background">
        <div className="container max-w-5xl px-6 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {fetchError || 'Failed to load workspace members'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--global-nav-height,0px))] overflow-y-auto bg-background">
      <div className="container max-w-5xl px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Users size={20} />
                Members
              </h1>
              <p className="text-sm text-muted-foreground">
                {overview.members.length} total member{overview.members.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              color="primary"
              radius="sm"
              onPress={() => setShowInviteForm(prev => !prev)}
              startContent={<MailPlus size={16} />}
            >
              Invite member
            </Button>
          </div>
        </div>

        {showInviteForm && (
          <form
            onSubmit={handleInvite}
            className="rounded-2xl border border-border bg-card p-6 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  required
                  disabled={!isOwnerOrAdmin}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={event => setInviteRole(event.target.value as WorkspaceRole)}
                  disabled={!isOwnerOrAdmin}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {inviteRole === 'member' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Access permissions</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof InvitePermissions>).map(key => (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={invitePermissions[key]}
                        onCheckedChange={checked =>
                          setInvitePermissions(prev => ({
                            ...prev,
                            [key]: checked,
                          }))
                        }
                        disabled={!isOwnerOrAdmin}
                        className="h-4 w-4 rounded border-border"
                      />
                      {PERMISSION_LABELS[key]}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isOwnerOrAdmin && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Only owner or admin can invite new members.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                color="primary"
                radius="sm"
                isDisabled={!isOwnerOrAdmin || inviteLoading}
                startContent={<SendIcon fontSize="small" />}
              >
                {inviteLoading ? 'Sending...' : 'Send invitation'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Search members by email"
              placeholder="Search by email"
              value={searchEmail}
              onValueChange={setSearchEmail}
              startContent={<Search size={16} className="text-muted-foreground" />}
              radius="sm"
              variant="bordered"
              className="w-full sm:max-w-sm"
            />

            <Dropdown placement="bottom-start">
              <DropdownTrigger>
                <Button radius="sm" variant="flat" className="min-w-[160px] justify-between">
                  Sort: {SORT_OPTIONS.find(option => option.key === sortBy)?.label || 'Name'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Member sorting"
                selectedKeys={[sortBy]}
                selectionMode="single"
                onAction={key => setSortBy(String(key) as MemberSortBy)}
              >
                {SORT_OPTIONS.map(option => (
                  <DropdownItem key={option.key}>{option.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            <Dropdown placement="bottom-start">
              <DropdownTrigger>
                <Button radius="sm" variant="flat" className="min-w-[180px] justify-between">
                  Role:{' '}
                  {ROLE_FILTER_OPTIONS.find(option => option.key === roleFilter)?.label ||
                    'All roles'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Member role filter"
                selectedKeys={[roleFilter]}
                selectionMode="single"
                onAction={key => setRoleFilter(String(key) as MemberRoleFilter)}
              >
                {ROLE_FILTER_OPTIONS.map(option => (
                  <DropdownItem key={option.key}>{option.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {visibleMembers.length} of {overview.members.length} members.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          {visibleMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members match current filters.</p>
          ) : (
            visibleMembers.map(member => {
              const canRemove = canRemoveMember(member);
              const roleTargets = getAllowedRoleTargets(member);
              const canManageRole = roleTargets.length > 0;
              const roleUpdating = updatingRoleMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {normalizeAvatarUrl(member.avatarUrl) ? (
                        <img
                          src={normalizeAvatarUrl(member.avatarUrl) as string}
                          alt={member.name || member.email || 'Member avatar'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(member.name || member.email)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name || member.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Timezone: {member.timeZone || 'Auto'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tooltip
                      content={ROLE_TOOLTIPS[member.role] || 'Workspace role'}
                      placement="top"
                    >
                      {canManageRole ? (
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <button
                              type="button"
                              disabled={roleUpdating}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity ${ROLE_STYLES[member.role] || ROLE_STYLES.member} ${roleUpdating ? 'opacity-60' : ''}`}
                            >
                              {roleUpdating ? 'Updating...' : getRoleLabel(member.role)}
                              <ChevronDown size={12} />
                            </button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label={`Change role for ${member.email || member.id}`}
                            onAction={key =>
                              void handleChangeMemberRole(member, String(key) as WorkspaceRole)
                            }
                          >
                            {roleTargets.map(role => (
                              <DropdownItem key={role} isDisabled={role === member.role}>
                                {getRoleLabel(role)}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      ) : (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      )}
                    </Tooltip>

                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          aria-label={`Actions for ${member.email || member.id}`}
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label={`Member actions for ${member.email || member.id}`}
                        onAction={key => void handleMemberMenuAction(member, String(key))}
                      >
                        {canManageRole ? (
                          <DropdownSection title="Change role">
                            {roleTargets.map(role => (
                              <DropdownItem key={`role:${role}`} isDisabled={role === member.role}>
                                Set as {getRoleLabel(role)}
                              </DropdownItem>
                            ))}
                          </DropdownSection>
                        ) : null}

                        <DropdownSection>
                          <DropdownItem
                            key="remove"
                            color="danger"
                            isDisabled={!canRemove || removingMemberId === member.id}
                            className="text-danger data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger data-[focus=true]:bg-danger/10 data-[focus=true]:text-danger"
                          >
                            {removingMemberId === member.id
                              ? 'Removing...'
                              : 'Remove from workspace'}
                          </DropdownItem>
                        </DropdownSection>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations
          </h2>
          <p className="text-xs text-muted-foreground">
            Invitations expire in {INVITATION_EXPIRY_DAYS} days.
          </p>

          {overview.invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active invitations. New invites will appear here with resend and revoke actions.
            </p>
          ) : (
            overview.invitations.map(invite => {
              const isResending = resendingInvitationId === invite.id;
              const isRevoking = revokingInvitationId === invite.id;
              const isActionBusy = isResending || isRevoking;

              return (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Role: {getRoleLabel(invite.role)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDate(invite.createdAt)} · Expires{' '}
                      {formatDate(invite.expiresAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      isDisabled={!isOwnerOrAdmin || isActionBusy}
                      isLoading={isResending}
                      onPress={() => void handleResendInvitation(invite)}
                    >
                      Resend
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isDisabled={!isOwnerOrAdmin || isActionBusy}
                      isLoading={isRevoking}
                      onPress={() => void handleRevokeInvitation(invite.id)}
                    >
                      Revoke
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      isDisabled={isActionBusy}
                      onPress={() => void copyInviteLink(invite.token, invite.link)}
                    >
                      Copy link
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
