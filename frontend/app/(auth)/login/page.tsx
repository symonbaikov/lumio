/* eslint-disable max-lines */
'use client';

import { AuthGreeting } from '@/app/components/AuthGreeting';
import { AuthLanguageSwitcher } from '@/app/components/AuthLanguageSwitcher';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import { syncLocaleFromUser } from '@/app/lib/locale';
import { safeInternalPath } from '@/app/lib/safe-path';
import { tokens } from '@/lib/theme-tokens';
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import AuthLayout from '../AuthLayout';

// eslint-disable-next-line complexity
function extractInviteTokenFromNext(nextPath: string | null): string | null {
  if (!nextPath) {
    return null;
  }
  try {
    const url = new URL(nextPath, 'http://localhost');
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'invite') {
      return null;
    }
    return segments[1] || null;
  } catch {
    const pathOnly = nextPath.split('?')[0]?.split('#')[0] || '';
    const segments = pathOnly.split('/').filter(Boolean);
    if (segments[0] !== 'invite') {
      return null;
    }
    return segments[1] || null;
  }
}

// eslint-disable-next-line max-lines-per-function, complexity
function LoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get('next'));
  const inviteTokenFromNext = extractInviteTokenFromNext(nextPath);
  const inviteToken = searchParams.get('invite') || inviteTokenFromNext;
  const t = useIntlayer('loginPage');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line max-lines-per-function, complexity
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      syncLocaleFromUser(user);
      if (user.workspaceId) {
        localStorage.setItem('currentWorkspaceId', user.workspaceId);
      }

      if (!inviteToken && user.onboardingCompletedAt == null) {
        window.location.href = '/onboarding';
        return;
      }

      const activeWorkspaceId = user.lastWorkspaceId || user.workspaceId;

      if (activeWorkspaceId) {
        localStorage.setItem('currentWorkspaceId', activeWorkspaceId);
        window.location.href = nextPath || DEFAULT_APP_ROUTE;
      } else {
        window.location.href = '/workspaces';
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t.loginFailed.value));
    } finally {
      setLoading(false);
    }
  };

  const sideContent = (
    <Box sx={{ color: 'white' }}>
      <Typography
        variant="h2"
        fontWeight="bold"
        gutterBottom
        sx={{
          fontFamily: 'var(--font-nunito), "Nunito", sans-serif',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        Lumio
      </Typography>
      <Typography variant="h5" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
        {t.rightTagline}
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        {/* Decorative elements representing "Contextual" and "Realtime" */}
        <Box
          sx={{
            p: 2,
            borderRadius: tokens.radius.md,
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Real-time Analytics
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: tokens.radius.md,
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Seamless Expense
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <AuthLayout sideContent={sideContent} topRightAction={<AuthLanguageSwitcher />}>
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: tokens.radius.full,
          bgcolor: 'var(--primary-fill)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <Typography variant="h4" color="white" fontWeight="bold">
          👋
        </Typography>
      </Box>

      <AuthGreeting />

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        {t.subtitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label={t.emailLabel.value}
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={e => setEmail(e.target.value)}
          InputProps={{
            sx: { borderRadius: tokens.radius.md },
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label={t.passwordLabel.value}
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          InputProps={{
            sx: { borderRadius: tokens.radius.md },
          }}
          sx={{ mb: 3 }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{
            py: 1.5,
            borderRadius: tokens.radius.full,
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t.submit}
        </Button>
        <Box textAlign="center" sx={{ mt: 3 }}>
          <Link
            href={
              nextPath
                ? `/register?next=${encodeURIComponent(nextPath)}${
                    inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ''
                  }`
                : '/register'
            }
            variant="body2"
            sx={{
              textDecoration: 'none',
              fontWeight: 600,
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {t.noAccount}
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
