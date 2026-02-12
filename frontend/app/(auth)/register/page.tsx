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

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get('next'));
  const inviteToken = searchParams.get('invite');
  const presetEmail = searchParams.get('email');
  const { locale } = useLocale();
  const t = useIntlayer('registerPage');
  const [formData, setFormData] = useState({
    email: presetEmail || '',
    password: '',
    name: '',
    company: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [emailLocked, setEmailLocked] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'email' && emailLocked) return;
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    if (!inviteToken) return;

    setInviteLoading(true);
    apiClient
      .get(`/workspaces/invitations/${inviteToken}`)
      .then(response => {
        const email = response.data?.email;
        if (typeof email === 'string' && email.trim()) {
          setFormData(prev => ({ ...prev, email }));
          setEmailLocked(true);
        }
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || t.inviteLoadFailed.value);
      })
      .finally(() => {
        setInviteLoading(false);
      });
  }, [inviteToken, t.inviteLoadFailed.value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        ...formData,
        invitationToken: inviteToken || undefined,
      });

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      window.location.href = nextPath || '/';
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error?.message || t.registerFailed.value,
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
          fontFamily: '"Nunitoga", sans-serif',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {t.rightTitle}
      </Typography>
      <Typography variant="h5" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
        {t.rightTagline}
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
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
            Secure & Safe
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
            Trusted by Millions
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
          bgcolor: 'secondary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <Typography variant="h4" color="white" fontWeight="bold">
          📝
        </Typography>
      </Box>

      <Typography
        component="h1"
        variant="h4"
        gutterBottom
        fontWeight="800"
        color="text.primary"
        align="center"
      >
        {t.title}
      </Typography>
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
            errorFallback={t.googleRegisterFailed.value}
          />
          <Divider sx={{ my: 3, width: '100%', color: 'text.secondary' }}>{t.orLabel}</Divider>
        </>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label={t.fullNameLabel.value}
          name="name"
          autoComplete="name"
          autoFocus
          value={formData.name}
          onChange={handleChange}
          InputProps={{
            sx: { borderRadius: 1.5 },
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          disabled={emailLocked || inviteLoading}
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
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          helperText={t.passwordHelper.value}
          InputProps={{
            sx: { borderRadius: 1.5 },
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          fullWidth
          id="company"
          label={t.companyLabel.value}
          name="company"
          value={formData.company}
          onChange={handleChange}
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
            boxShadow: '0 4px 14px 0 rgba(102,102,102,0.39)', // Secondary/Gray shadow
            bgcolor: 'secondary.main',
            transition: 'transform 0.2s',
            '&:hover': {
              bgcolor: 'secondary.dark',
              transform: 'scale(1.02)',
              boxShadow: '0 6px 20px rgba(102,102,102,0.23)',
            },
          }}
          disabled={loading || inviteLoading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t.submit}
        </Button>
        <Box textAlign="center" sx={{ mt: 3 }}>
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
            variant="body2"
            sx={{
              textDecoration: 'none',
              fontWeight: 600,
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {t.haveAccount}
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
