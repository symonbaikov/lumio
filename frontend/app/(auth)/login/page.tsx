'use client';

import { AuthLanguageSwitcher } from '@/app/components/AuthLanguageSwitcher';
import { GoogleAuthButton } from '@/app/components/GoogleAuthButton';
import apiClient from '@/app/lib/api';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AuthLayout from '../AuthLayout';

function safeInternalPath(nextPath: string | null) {
  if (!nextPath) return null;
  if (!nextPath.startsWith('/')) return null;
  if (nextPath.startsWith('//')) return null;
  return nextPath;
}

function extractInviteTokenFromNext(nextPath: string | null) {
  if (!nextPath) return null;
  try {
    const url = new URL(nextPath, 'http://localhost');
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'invite') return null;
    return segments[1] || null;
  } catch {
    const pathOnly = nextPath.split('?')[0]?.split('#')[0] || '';
    const segments = pathOnly.split('/').filter(Boolean);
    if (segments[0] !== 'invite') return null;
    return segments[1] || null;
  }
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get('next'));
  const inviteTokenFromNext = extractInviteTokenFromNext(nextPath);
  const inviteToken = searchParams.get('invite') || inviteTokenFromNext;
  const { locale } = useLocale();
  const t = useIntlayer('loginPage');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const [helloIndex, setHelloIndex] = useState(0);

  const GREETINGS = [
    { text: 'Добро пожаловать', lang: 'ru' },
    { text: 'Қош келдіңіз', lang: 'kk' },
    { text: 'Welcome', lang: 'en' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHelloIndex(prev => (prev + 1) % GREETINGS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (user.workspaceId) {
        localStorage.setItem('currentWorkspaceId', user.workspaceId);
      }

      if (!inviteToken && user.onboardingCompletedAt == null) {
        window.location.href = '/onboarding';
        return;
      }

      if (user.lastWorkspaceId) {
        localStorage.setItem('currentWorkspaceId', user.lastWorkspaceId);
        window.location.href = nextPath || '/';
      } else {
        window.location.href = '/workspaces';
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error?.message || t.loginFailed.value,
      );
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
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
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
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
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
    <AuthLayout sideContent={sideContent}>
      <Box sx={{ position: 'absolute', top: 0, right: 0, p: 2 }}>
        <AuthLanguageSwitcher />
      </Box>

      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          bgcolor: 'primary.main',
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

      <Box
        sx={{
          height: 50,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={helloIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute', width: '100%', textAlign: 'center' }}
          >
            <Typography variant="h4" fontWeight="800" color="text.primary">
              {GREETINGS[helloIndex].text}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        {t.subtitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {googleEnabled && (
        <>
          <GoogleAuthButton
            inviteToken={inviteToken}
            nextPath={nextPath}
            onError={setError}
            errorFallback={t.googleLoginFailed.value}
          />
          <Divider sx={{ my: 3, width: '100%', color: 'text.secondary' }}>{t.orLabel}</Divider>
        </>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={e => setEmail(e.target.value)}
          InputProps={{
            sx: { borderRadius: 1.5 },
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
            sx: { borderRadius: 1.5 },
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
            borderRadius: 50,
            fontSize: '1rem',
            fontWeight: 'bold',
            textTransform: 'none',
            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
            background: 'linear-gradient(45deg, #0a66c2 30%, #42a5f5 90%)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0 6px 20px rgba(0,118,255,0.23)',
            },
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
