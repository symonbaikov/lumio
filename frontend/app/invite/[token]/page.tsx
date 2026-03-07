'use client';

import apiClient from '@/app/lib/api';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { useIntlayer } from "@/app/i18n";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

type InvitationInfo = {
  status: InvitationStatus;
  email: string;
  workspace: { id: string; name: string };
  role: string;
  expiresAt: string | null;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  workspaceId?: string | null;
};

function safeInternalPath(nextPath: string | null) {
  if (!nextPath) return null;
  if (!nextPath.startsWith('/')) return null;
  if (nextPath.startsWith('//')) return null;
  return nextPath;
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const t = useIntlayer('invitePage');
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const nextPath = useMemo(() => (token ? `/invite/${token}` : null), [token]);

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setInvitationLoading(true);
    setInvitationError(null);

    apiClient
      .get(`/workspaces/invitations/${token}`)
      .then(response => {
        setInvitation(response.data);
      })
      .catch((err: any) => {
        setInvitationError(err?.response?.data?.message || t.errors.loadFailed.value);
      })
      .finally(() => {
        setInvitationLoading(false);
      });
  }, [token, t.errors.loadFailed.value]);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    setAuthLoading(true);
    apiClient
      .get('/auth/me')
      .then(response => {
        setUser(response.data);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const isEmailMatch = useMemo(() => {
    if (!user?.email || !invitation?.email) return false;
    return user.email.trim().toLowerCase() === invitation.email.trim().toLowerCase();
  }, [invitation?.email, user?.email]);

  const loginHref = useMemo(() => {
    const safeNext = safeInternalPath(nextPath);
    return safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login';
  }, [nextPath]);

  const registerHref = useMemo(() => {
    const safeNext = safeInternalPath(nextPath);
    if (!safeNext || !token) return '/register';
    return `/register?next=${encodeURIComponent(safeNext)}&invite=${encodeURIComponent(token)}`;
  }, [nextPath, token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    setAcceptError(null);
    setAcceptSuccess(null);

    try {
      const response = await apiClient.post(`/workspaces/invitations/${token}/accept`);

      const message = response.data?.message || t.messages.acceptedFallback.value;
      const workspaceId = response.data?.workspaceId || null;

      setAcceptSuccess(message);

      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as Record<string, unknown>;
          localStorage.setItem('user', JSON.stringify({ ...parsed, workspaceId }));
        } else if (user) {
          localStorage.setItem('user', JSON.stringify({ ...user, workspaceId }));
        }
      } catch {
        // ignore localStorage update issues
      }

      window.location.href = '/settings/workspace';
    } catch (err: any) {
      setAcceptError(err?.response?.data?.message || t.errors.acceptFailed.value);
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginAsAnother = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push(loginHref);
  };

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{t.invalidLink}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <ShieldCheck size={24} />
              <Typography variant="h5" fontWeight={700}>
                {t.title}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t.subtitle}
            </Typography>

            {invitationError && <Alert severity="error">{invitationError}</Alert>}

            {invitationLoading && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress />
              </Box>
            )}

            {invitation && (
              <Stack spacing={1}>
                <Typography variant="body2">
                  {t.details.workspace.value}: <b>{invitation.workspace?.name}</b>
                </Typography>
                <Typography variant="body2">
                  {t.details.role.value}: <b>{invitation.role}</b>
                </Typography>
                {invitation.expiresAt && (
                  <Typography variant="body2">
                    {t.details.expiresAt.value}:{' '}
                    <b>{new Date(invitation.expiresAt).toLocaleString()}</b>
                  </Typography>
                )}
                <Typography variant="body2">
                  {t.details.email.value}: <b>{invitation.email}</b>
                </Typography>

                {invitation.status !== 'pending' && (
                  <Alert severity="info">{t.statusMessages[invitation.status].value}</Alert>
                )}
              </Stack>
            )}

            {acceptError && <Alert severity="error">{acceptError}</Alert>}
            {acceptSuccess && <Alert severity="success">{acceptSuccess}</Alert>}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {authLoading ? (
                <CircularProgress size={20} />
              ) : !user ? (
                <>
                  <Button variant="outlined" onClick={() => router.push(loginHref)}>
                    {t.actions.login}
                  </Button>
                  <Button variant="contained" onClick={() => router.push(registerHref)}>
                    {t.actions.register}
                  </Button>
                </>
              ) : !invitation ? null : !isEmailMatch ? (
                <>
                  <Alert severity="warning" sx={{ flex: 1 }}>
                    {t.messages.wrongAccount.value} <b>{invitation.email}</b>
                  </Alert>
                  <Button variant="contained" onClick={handleLoginAsAnother}>
                    {t.actions.loginAnother}
                  </Button>
                </>
              ) : invitation.status === 'pending' ? (
                <Button
                  variant="contained"
                  onClick={handleAccept}
                  disabled={accepting}
                  startIcon={accepting ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {t.actions.accept}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => {
                    window.location.href = '/settings/workspace';
                  }}
                >
                  {t.actions.goToApp}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
