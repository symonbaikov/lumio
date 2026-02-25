'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import SendIcon from '@mui/icons-material/Send';
import { MailPlus, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type WorkspaceOverview = {
  workspace: { id: string; name: string; ownerId?: string | null; createdAt?: string };
  members: Array<{
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string | null;
    timeZone?: string | null;
    role: string;
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
    role: string;
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

const getInitials = (value?: string) =>
  (value || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

const getApiMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;

export default function WorkspaceMembersView() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [invitePermissions, setInvitePermissions] = useState<InvitePermissions>({
    canEditStatements: true,
    canEditCustomTables: true,
    canEditCategories: true,
    canEditDataEntry: true,
    canShareFiles: false,
  });

  const isOwnerOrAdmin = useMemo(() => {
    const member = overview?.members.find(item => item.id === user?.id);
    return member?.role === 'owner' || member?.role === 'admin';
  }, [overview?.members, user?.id]);

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
            <button
              type="button"
              onClick={() => setShowInviteForm(prev => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <MailPlus size={16} />
              Invite member
            </button>
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
                  onChange={event => setInviteRole(event.target.value)}
                  disabled={!isOwnerOrAdmin}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="member">Member</option>
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
              <button
                type="submit"
                disabled={!isOwnerOrAdmin || inviteLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SendIcon fontSize="small" />
                {inviteLoading ? 'Sending...' : 'Send invitation'}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          {overview.members.map(member => {
            const canRemove =
              isOwnerOrAdmin &&
              member.role !== 'owner' &&
              member.id !== user?.id &&
              (overview.workspace.ownerId === user?.id || member.role === 'member');

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
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}
                  >
                    {ROLE_LABELS[member.role] || member.role}
                  </span>

                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations
          </h2>

          {overview.invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active invitations.</p>
          ) : (
            overview.invitations.map(invite => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {ROLE_LABELS[invite.role] || invite.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyInviteLink(invite.token, invite.link)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Copy link
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
