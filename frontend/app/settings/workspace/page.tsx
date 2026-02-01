'use client';

import { useAuth } from '@/app/hooks/useAuth';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { AxiosError } from 'axios';
import { Check, ChevronDown, ChevronUp, Copy, MailPlus, MoreVertical, Shield, Users } from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const isLocalhostUrl = (value: string) => {
  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
    const url = new URL(hasScheme ? value : `https://${value}`);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  } catch {
    return false;
  }
};

type WorkspaceOverview = {
  workspace: { id: string; name: string; ownerId?: string | null; createdAt?: string };
  members: Array<{
    id: string;
    email?: string;
    name?: string;
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

// Backgrounds are now loaded dynamically from /api/backgrounds
const FALLBACK_BACKGROUNDS = [
  'vidar-nordli-mathisen-641pLhGEEyg-unsplash.jpg',
  'ferdinand-stohr-W1FIkdPAB7E-unsplash.jpg',
  'johny-goerend-McSOHojERSI-unsplash.jpg',
  'lightscape-LtnPejWDSAY-unsplash.jpg',
];

export default function WorkspaceSettingsPage() {
  const { user, loading } = useAuth();
  const { updateWorkspaceBackground } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('settingsWorkspacePage');
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitePermissions, setInvitePermissions] = useState<InvitePermissions>({
    canEditStatements: true,
    canEditCustomTables: true,
    canEditCategories: true,
    canEditDataEntry: true,
    canShareFiles: false,
  });
  const [removeMenuAnchor, setRemoveMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Workspace metadata editing
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceBackground, setWorkspaceBackground] = useState<string | null>(null);
  const [allBackgrounds, setAllBackgrounds] = useState<string[]>([]);
  const [showAllBackgrounds, setShowAllBackgrounds] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwnerOrAdmin = useMemo(() => {
    const member = overview?.members.find(m => m.id === user?.id);
    return member?.role === 'owner' || member?.role === 'admin';
  }, [overview?.members, user?.id]);

  const appBaseUrl = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured && configured.trim().length > 0 && !isLocalhostUrl(configured)) {
      return configured.replace(/\/$/, '');
    }
    return window.location.origin;
  }, []);

  const getApiErrorMessage = useCallback((error: unknown, fallback: string) => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError?.response?.data?.message ?? fallback;
  }, []);

  const loadOverview = useCallback(async () => {
    setFetchError(null);
    try {
      const response = await apiClient.get<WorkspaceOverview>('/workspaces/me');
      setOverview(response.data);
      setWorkspaceName(response.data.workspace.name);

      // Load full workspace data to get background and description
      const fullWorkspaceResponse = await apiClient.get(
        `/workspaces/${response.data.workspace.id}`,
      );
      setWorkspaceBackground(fullWorkspaceResponse.data.backgroundImage);
      setWorkspaceDescription(fullWorkspaceResponse.data.description ?? '');
    } catch (error: unknown) {
      setFetchError(getApiErrorMessage(error, t.errors.loadOverview.value));
    }
  }, [getApiErrorMessage, t.errors.loadOverview.value]);

  const loadAllBackgrounds = useCallback(async () => {
    try {
      setLoadingBackgrounds(true);
      const response = await fetch('/api/backgrounds');
      if (response.ok) {
        const data = await response.json();
        setAllBackgrounds(data);
      } else {
        setAllBackgrounds(FALLBACK_BACKGROUNDS);
      }
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
      setAllBackgrounds(FALLBACK_BACKGROUNDS);
    } finally {
      setLoadingBackgrounds(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadOverview();
      void loadAllBackgrounds();
    }
  }, [loadOverview, loadAllBackgrounds, user]);

  const handleRemoveMember = async () => {
    if (!selectedMemberId) return;
    setRemoving(true);
    try {
      await apiClient.delete(`/workspaces/members/${selectedMemberId}`);
      toast.success('Доступ отозван');
      await loadOverview();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Не удалось отозвать доступ'));
    } finally {
      setRemoving(false);
      setRemoveMenuAnchor(null);
      setSelectedMemberId(null);
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteLoading(true);
    setInviteLink(null);
    try {
      const response = await apiClient.post('/workspaces/invitations', {
        email: inviteEmail,
        role: inviteRole,
        permissions: inviteRole === 'member' ? invitePermissions : undefined,
      });
      setInviteEmail('');
      setInviteLink(response.data?.invitationLink);
      toast.success(t.toasts.inviteSent.value);
      await loadOverview();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t.errors.inviteFailed.value));
    } finally {
      setInviteLoading(false);
    }
  };

  const copyLink = async (link?: string | null) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t.toasts.linkCopied.value);
    } catch {
      toast.error(t.errors.copyFailed.value);
    }
  };

  const handleUpdateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!overview?.workspace.id) return;

    setEditingWorkspace(true);
    try {
      await apiClient.patch(`/workspaces/${overview.workspace.id}`, {
        name: workspaceName,
        description: workspaceDescription || undefined,
      });
      toast.success('Workspace updated successfully');
      await loadOverview();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update workspace'));
    } finally {
      setEditingWorkspace(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!overview?.workspace.id) return;

    try {
      await apiClient.delete(`/workspaces/${overview.workspace.id}`);
      toast.success('Workspace deleted successfully');
      window.location.href = '/workspaces';
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to delete workspace'));
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleBackgroundChange = async (background: string) => {
    if (!overview?.workspace.id) return;

    try {
      await updateWorkspaceBackground(overview.workspace.id, background);
      setWorkspaceBackground(background);
      toast.success('Background updated successfully');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update background'));
    }
  };

  const roleLabels: Record<string, string> = {
    owner: t.roles.owner.value,
    admin: t.roles.admin.value,
    member: t.roles.member.value,
  };

  const hasAdminSections = Boolean(overview && isOwnerOrAdmin);

  const compactCardSx = {
    borderColor: 'divider',
    boxShadow: 'none',
  };

  const compactCardContentSx = {
    p: 2,
  };

  const resolveLocale = useCallback((value: string) => {
    if (value === 'ru') return 'ru-RU';
    if (value === 'kk') return 'kk-KZ';
    return 'en-US';
  }, []);

  const formatDate = useCallback(
    (iso?: string) => {
      if (!iso) return '';
      return new Date(iso).toLocaleDateString(resolveLocale(locale), { timeZone: 'UTC' });
    },
    [locale, resolveLocale],
  );

  const roleDescriptions = useMemo(() => {
    const toNode = (value: unknown, fallbackText: string): ReactNode => {
      if (value === null || value === undefined) return fallbackText;
      return value as ReactNode;
    };

    const fallback =
      locale === 'kk'
        ? {
            member:
              'Деректермен жұмыс істей алады, бірақ қатысушылар мен қолжетімділікті басқара алмайды.',
            admin: 'Қатысушылар мен қолжетімділікті басқарып, шақыру жібере алады.',
          }
        : locale === 'en'
          ? {
              member: 'Can work with data, but can’t manage members or access.',
              admin: 'Can manage members and access, and send invitations.',
            }
          : {
              member: 'Может работать с данными, но не управляет участниками и доступом.',
              admin: 'Может управлять участниками и доступом, отправлять приглашения.',
            };

    const rolesAny = t.roles as unknown as Record<string, unknown>;
    return {
      member: toNode(rolesAny.memberDescription, fallback.member),
      admin: toNode(rolesAny.adminDescription, fallback.admin),
    };
  }, [locale, t.roles]);

  const invitePermissionCopy = useMemo(() => {
    const toNode = (value: unknown, fallbackText: string): ReactNode => {
      if (value === null || value === undefined) return fallbackText;
      return value as ReactNode;
    };

    const fallback =
      locale === 'kk'
        ? {
            title: 'Қолжетімділік құқықтары',
            hint: 'Қатысушы нені өңдей алатынын белгілеңіз. Белгіленбесе — тек көру.',
            labels: {
              canEditStatements: 'Үзінділер',
              canEditCustomTables: 'Кестелер',
              canEditCategories: 'Санаттар',
              canEditDataEntry: 'Деректерді енгізу',
              canShareFiles: 'Файлдарға сілтеме және қолжетімділік',
            },
          }
        : locale === 'en'
          ? {
              title: 'Access permissions',
              hint: 'Select what the member can edit. If unchecked, they can only view.',
              labels: {
                canEditStatements: 'Statements',
                canEditCustomTables: 'Tables',
                canEditCategories: 'Categories',
                canEditDataEntry: 'Data entry',
                canShareFiles: 'File sharing & access',
              },
            }
          : {
              title: 'Права доступа',
              hint: 'Отметьте, что может редактировать участник. Если не отмечено — только просмотр.',
              labels: {
                canEditStatements: 'Выписки',
                canEditCustomTables: 'Таблицы',
                canEditCategories: 'Категории',
                canEditDataEntry: 'Ввод данных',
                canShareFiles: 'Ссылки и доступ к файлам',
              },
            };

    const inviteAny = t.invite as unknown as Record<string, unknown>;
    const permissionsAny = (inviteAny.permissions as unknown as Record<string, unknown>) || {};

    return {
      title: toNode(inviteAny.permissionsTitle, fallback.title),
      hint: toNode(inviteAny.permissionsHint, fallback.hint),
      labels: {
        canEditStatements: toNode(
          permissionsAny.canEditStatements,
          fallback.labels.canEditStatements,
        ),
        canEditCustomTables: toNode(
          permissionsAny.canEditCustomTables,
          fallback.labels.canEditCustomTables,
        ),
        canEditCategories: toNode(
          permissionsAny.canEditCategories,
          fallback.labels.canEditCategories,
        ),
        canEditDataEntry: toNode(permissionsAny.canEditDataEntry, fallback.labels.canEditDataEntry),
        canShareFiles: toNode(permissionsAny.canShareFiles, fallback.labels.canShareFiles),
      } satisfies Record<keyof InvitePermissions, ReactNode>,
    };
  }, [locale, t.invite]);

  if (loading) {
    return (
      <Container
        maxWidth={false}
        className="container-shared"
        sx={{ py: 8, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth={false} className="container-shared" sx={{ py: 6 }}>
        <Alert severity="warning">{t.authRequired}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} className="container-shared" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {t.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.subtitle}
          </Typography>
        </Box>

        {fetchError && <Alert severity="error">{fetchError}</Alert>}

        {overview && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: hasAdminSections ? '1.1fr 1fr' : '1fr',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {hasAdminSections && (
              <Stack spacing={2}>
                {/* Workspace Metadata Settings */}
                <Card variant="outlined" sx={compactCardSx}>
                  <CardContent sx={compactCardContentSx}>
                    <Stack spacing={1.5} component="form" onSubmit={handleUpdateWorkspace}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Workspace Settings
                      </Typography>
                      <TextField
                        label="Workspace Name"
                        value={workspaceName}
                        onChange={e => setWorkspaceName(e.target.value)}
                        fullWidth
                        required
                        size="small"
                      />
                      <TextField
                        label="Description (optional)"
                        value={workspaceDescription}
                        onChange={e => setWorkspaceDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                      />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Button
                          type="submit"
                          variant="contained"
                          size="small"
                          disabled={editingWorkspace}
                        >
                          {editingWorkspace ? 'Saving...' : 'Save Changes'}
                        </Button>
                        {overview.workspace.ownerId === user?.id && (
                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            Delete Workspace
                          </Button>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Background Image Selection */}
                <Card variant="outlined" sx={compactCardSx}>
                  <CardContent sx={compactCardContentSx}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Background Image
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose a background image for your workspace
                      </Typography>
                      <Box>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 1.5,
                          }}
                        >
                          {(allBackgrounds.length > 0
                            ? showAllBackgrounds
                              ? allBackgrounds
                              : allBackgrounds.slice(0, 10)
                            : showAllBackgrounds
                              ? FALLBACK_BACKGROUNDS
                              : FALLBACK_BACKGROUNDS.slice(0, 10)
                          ).map(background => (
                            <Box
                              key={background}
                              onClick={() => handleBackgroundChange(background)}
                              sx={{
                                position: 'relative',
                                aspectRatio: '16/9',
                                borderRadius: 1.5,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor:
                                  workspaceBackground === background ? 'primary.main' : 'divider',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': {
                                  borderColor: 'primary.light',
                                  boxShadow: 1,
                                },
                              }}
                            >
                              <Box
                                component="img"
                                src={`/workspace-backgrounds/${background}`}
                                alt={background}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              {workspaceBackground === background && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    borderRadius: '999px',
                                    p: 0.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 1,
                                  }}
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>

                        {allBackgrounds.length > 10 && (
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => setShowAllBackgrounds(!showAllBackgrounds)}
                              startIcon={
                                showAllBackgrounds ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                              }
                            >
                              {showAllBackgrounds
                                ? (t as any).backgrounds?.showLess
                                : (t as any).backgrounds?.showMore}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}

            <Stack spacing={2}>
              <Card variant="outlined" data-tour-id="members-card" sx={compactCardSx}>
                <CardContent sx={compactCardContentSx}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Users size={18} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t.members.title}
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {overview.members.map(member => {
                        const currentIsOwner = overview.workspace.ownerId === user?.id;
                        const canRemove =
                          isOwnerOrAdmin &&
                          member.role !== 'owner' &&
                          member.id !== user?.id &&
                          (currentIsOwner || member.role === 'member');

                        return (
                          <Box
                            key={member.id}
                            data-tour-id="member-card"
                            sx={{
                              p: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {member.name || member.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {member.email}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={roleLabels[member.role] || member.role}
                                color={member.role === 'owner' ? 'primary' : 'default'}
                                size="small"
                                variant="outlined"
                              />
                              {canRemove && (
                                <IconButton
                                  size="small"
                                  aria-label="remove"
                                  onClick={event => {
                                    setSelectedMemberId(member.id);
                                    setRemoveMenuAnchor(event.currentTarget);
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </IconButton>
                              )}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" data-tour-id="invite-card" sx={compactCardSx}>
                <CardContent sx={compactCardContentSx}>
                  <Stack spacing={1.5} component="form" onSubmit={handleInvite}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MailPlus size={18} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t.invite.title}
                      </Typography>
                    </Stack>
                    {!isOwnerOrAdmin && <Alert severity="info">{t.invite.onlyAdminHint}</Alert>}
                    <TextField
                      label="Email"
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      fullWidth
                      required
                      disabled={!isOwnerOrAdmin}
                      data-tour-id="invite-email-field"
                      size="small"
                    />
                    <FormControl
                      component="fieldset"
                      disabled={!isOwnerOrAdmin}
                      data-tour-id="role-selection"
                    >
                      <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                        {t.roles.roleLabel}
                      </FormLabel>
                      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        <FormControlLabel
                          sx={{ alignItems: 'flex-start', m: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              checked={inviteRole === 'member'}
                              onChange={(_, checked) => {
                                if (checked) setInviteRole('member');
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {t.roles.member}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {roleDescriptions.member}
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          sx={{ alignItems: 'flex-start', m: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              checked={inviteRole === 'admin'}
                              onChange={(_, checked) => {
                                if (checked) setInviteRole('admin');
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {t.roles.admin}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {roleDescriptions.admin}
                              </Typography>
                            </Box>
                          }
                        />
                      </Stack>
                    </FormControl>
                    {inviteRole === 'member' && (
                      <FormControl
                        component="fieldset"
                        disabled={!isOwnerOrAdmin}
                        data-tour-id="permissions-section"
                      >
                        <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                          {invitePermissionCopy.title}
                        </FormLabel>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                          {invitePermissionCopy.hint}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 0.5,
                          }}
                        >
                          {(
                            [
                              'canEditStatements',
                              'canEditCustomTables',
                              'canEditCategories',
                              'canEditDataEntry',
                              'canShareFiles',
                            ] as Array<keyof InvitePermissions>
                          ).map(key => (
                            <FormControlLabel
                              key={key}
                              sx={{ m: 0 }}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={invitePermissions[key]}
                                  onChange={(_, checked) => {
                                    setInvitePermissions(prev => ({ ...prev, [key]: checked }));
                                  }}
                                />
                              }
                              label={<Typography variant="body2">{invitePermissionCopy.labels[key]}</Typography>}
                            />
                          ))}
                        </Box>
                      </FormControl>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="small"
                        startIcon={<Shield size={16} />}
                        disabled={!isOwnerOrAdmin || inviteLoading}
                        data-tour-id="send-invite-button"
                      >
                        {inviteLoading ? <CircularProgress size={18} color="inherit" /> : t.invite.send}
                      </Button>
                    </Box>
                    {inviteLink && (
                      <Alert
                        severity="success"
                        data-tour-id="invite-link-alert"
                        action={
                          <IconButton
                            color="inherit"
                            size="small"
                            onClick={() => copyLink(inviteLink)}
                          >
                            <Copy size={16} />
                          </IconButton>
                        }
                      >
                        {t.invite.inviteLinkLabel}: {inviteLink}
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" data-tour-id="pending-invitations-card" sx={compactCardSx}>
                <CardContent sx={compactCardContentSx}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t.pending.title}
                    </Typography>
                    {overview.invitations.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {t.pending.empty}
                      </Typography>
                    )}
                    <Stack spacing={1}>
                      {overview.invitations.map(invite => {
                        const link = invite.link || `${appBaseUrl}/invite/${invite.token}`;
                        return (
                          <Box
                            key={invite.id}
                            sx={{
                              p: 1,
                              border: '1px dashed',
                              borderColor: 'divider',
                              borderRadius: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {invite.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t.roles.roleLabel}: {roleLabels[invite.role] || invite.role}
                              </Typography>
                              {invite.expiresAt && (
                                <Typography variant="caption" color="text.secondary">
                                  {t.pending.validUntil}: {formatDate(invite.expiresAt)}
                                </Typography>
                              )}
                            </Box>
                            <Button
                              variant="text"
                              size="small"
                              startIcon={<Copy size={14} />}
                              onClick={() => copyLink(link)}
                            >
                              {t.pending.copyLink}
                            </Button>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}
      </Stack>
      <Menu
        anchorEl={removeMenuAnchor}
        open={Boolean(removeMenuAnchor)}
        onClose={() => {
          setRemoveMenuAnchor(null);
          setSelectedMemberId(null);
        }}
      >
        <MenuItem
          onClick={handleRemoveMember}
          disabled={removing}
          sx={{ color: 'error.main', fontWeight: 600 }}
        >
          {removing ? 'Удаляю…' : 'Отозвать доступ'}
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <Card sx={{ maxWidth: 500, m: 2 }} onClick={e => e.stopPropagation()}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Delete Workspace?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This action cannot be undone. All data associated with this workspace will be
                permanently deleted.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="contained" color="error" onClick={handleDeleteWorkspace}>
                  Delete Workspace
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Container>
  );
}
