'use client';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { Alert } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { cn } from '@/app/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { MAX_AVATAR_SIZE_BYTES } from '@/app/lib/constants';
import type { AxiosError } from 'axios';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react';

type AppLocale = 'ru' | 'en' | 'kk';
type ApiErrorResponse = { message?: string; error?: { message?: string } };

const sections = ['profile', 'sessions', 'email', 'password', 'appearance'] as const;
type SectionId = (typeof sections)[number];

const normalizeLocale = (value: unknown): AppLocale => {
  if (value === 'ru' || value === 'en' || value === 'kk') return value;
  return 'ru';
};

const normalizeSection = (value: string | null | undefined): SectionId => {
  if (!value) return 'profile';
  if ((sections as readonly string[]).includes(value)) return value as SectionId;
  return 'profile';
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return (
    axiosError?.response?.data?.message || axiosError?.response?.data?.error?.message || fallback
  );
};

const getInitials = (value: string) => {
  if (!value) return '—';
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '—';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const { locale, setLocale } = useLocale();
  const t = useIntlayer('settingsProfilePage');
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [profileName, setProfileName] = useState('');
  const [profileLocale, setProfileLocale] = useState<AppLocale>('ru');
  const [profileTimeZone, setProfileTimeZone] = useState<string>('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarErrorMessage, setAvatarErrorMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.name) {
      setProfileName(user.name);
    }
    setProfileLocale(normalizeLocale(user?.locale ?? locale));
    setProfileTimeZone(user?.timeZone || '');
  }, [locale, user]);

  useEffect(() => {
    setActiveSection(normalizeSection(window.location.hash?.replace('#', '')));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeSection}`);
  }, [activeSection]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    try {
      setProfileLoading(true);
      const response = await apiClient.patch('/users/me/preferences', {
        name: profileName,
        locale: profileLocale,
        timeZone: profileTimeZone ? profileTimeZone : null,
      });
      setProfileMessage(response.data?.message || t.profileCard.successFallback.value);

      if (normalizeLocale(locale) !== profileLocale) {
        setLocale(profileLocale);
      }
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error, t.profileCard.errorFallback.value));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarMessage(null);
    setAvatarErrorMessage(null);

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarErrorMessage(
        (t as any).profileCard?.avatarSizeError?.value || 'Avatar file is too large',
      );
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await apiClient.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUser = response.data?.user || user;
      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setAvatarMessage((t as any).profileCard?.avatarUpdated?.value || 'Avatar updated');
    } catch (error: unknown) {
      setAvatarErrorMessage(
        getApiErrorMessage(
          error,
          (t as any).profileCard?.avatarError?.value || 'Failed to update avatar',
        ),
      );
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleLogoutAll = async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout-all error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailMessage(null);
    setEmailError(null);

    if (!emailPassword) {
      setEmailError(t.validation.passwordRequiredForEmail.value);
      return;
    }

    try {
      setEmailLoading(true);
      const response = await apiClient.patch('/users/me/email', {
        email,
        currentPassword: emailPassword,
      });

      setEmailMessage(response.data?.message || t.emailCard.successFallback.value);
      setEmailPassword('');
    } catch (error: unknown) {
      setEmailError(getApiErrorMessage(error, t.emailCard.errorFallback.value));
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwords.next !== passwords.confirm) {
      setPasswordError(t.validation.passwordMismatch.value);
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiClient.patch('/users/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });

      setPasswordMessage(response.data?.message || t.passwordCard.successFallback.value);
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (error: unknown) {
      setPasswordError(getApiErrorMessage(error, t.passwordCard.errorFallback.value));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-shared flex justify-center px-4 py-16">
        <CircularProgress size={32} color="inherit" className="text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container-shared px-4 py-10">
        <Alert className="max-w-xl" variant="default">
          {t.authRequired.value}
        </Alert>
      </div>
    );
  }

  const appearanceTitle = (t as any).appearanceCard?.title?.value ?? 'Appearance';
  const appearanceDescription = (t as any).appearanceCard?.description?.value ?? '';

  const sectionMeta: Record<
    SectionId,
    {
      title: string;
      description?: string;
      icon: ComponentType<{ className?: string }>;
    }
  > = {
    profile: { title: t.profileCard.title.value, icon: AccountCircleIcon },
    sessions: {
      title: t.sessionsCard.title.value,
      description: t.sessionsCard.logoutAllHelp.value,
      icon: SecurityIcon,
    },
    email: { title: t.emailCard.title.value, icon: MailOutlineIcon },
    password: { title: t.passwordCard.title.value, icon: LockOutlinedIcon },
    appearance: {
      title: appearanceTitle,
      description: appearanceDescription,
      icon: PaletteOutlinedIcon,
    },
  };

  const renderSectionContent = () => {
    if (activeSection === 'profile') {
      return (
        <form className="space-y-5" onSubmit={handleProfileSubmit}>
          {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
          {profileError && <Alert variant="error">{profileError}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="profile-name">{t.profileCard.nameLabel.value}</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-locale">{t.profileCard.languageLabel.value}</Label>
              <Select
                id="profile-locale"
                value={profileLocale}
                onChange={e => setProfileLocale(normalizeLocale(e.target.value))}
              >
                <option value="ru">{t.profileCard.languages.ru.value}</option>
                <option value="en">{t.profileCard.languages.en.value}</option>
                <option value="kk">{t.profileCard.languages.kk.value}</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-timezone">{t.profileCard.timeZoneLabel.value}</Label>
              <Select
                id="profile-timezone"
                value={profileTimeZone}
                onChange={e => setProfileTimeZone(e.target.value)}
              >
                <option value="">{t.profileCard.timeZones.auto.value}</option>
                <option value="UTC">{t.profileCard.timeZones.utc.value}</option>
                <option value="Europe/Moscow">{t.profileCard.timeZones.europeMoscow.value}</option>
                <option value="Asia/Almaty">{t.profileCard.timeZones.asiaAlmaty.value}</option>
              </Select>
              <p className="text-xs text-gray-500">{t.profileCard.timeZoneHelp.value}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={profileLoading} className="gap-2">
              {profileLoading && <CircularProgress size={16} color="inherit" />}
              {t.profileCard.submit.value}
            </Button>
          </div>
        </form>
      );
    }

    if (activeSection === 'sessions') {
      return (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">
              {t.sessionsCard.lastLoginLabel.value}:
            </span>{' '}
            {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}
          </div>

          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleLogoutAll} className="gap-2">
              <LogoutIcon className="text-[18px]" />
              {t.sessionsCard.logoutAllButton.value}
            </Button>
          </div>
        </div>
      );
    }

    if (activeSection === 'email') {
      return (
        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          {emailMessage && <Alert variant="success">{emailMessage}</Alert>}
          {emailError && <Alert variant="error">{emailError}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="email-next">{t.emailCard.newEmailLabel.value}</Label>
            <Input
              id="email-next"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-password">{t.emailCard.currentPasswordLabel.value}</Label>
            <Input
              id="email-password"
              type="password"
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">{t.emailCard.currentPasswordHelp.value}</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={emailLoading} className="gap-2">
              {emailLoading && <CircularProgress size={16} color="inherit" />}
              {t.emailCard.submit.value}
            </Button>
          </div>
        </form>
      );
    }

    if (activeSection === 'appearance') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {(t as any).appearanceCard?.themeLabel?.value ?? 'Theme'}
              </div>
              <div className="text-xs text-gray-500">
                {(t as any).appearanceCard?.themeHelp?.value ?? ''}
              </div>
            </div>
            <div>
              <ModeToggle />
            </div>
          </div>
        </div>
      );
    }

    return (
      <form className="space-y-5" onSubmit={handlePasswordSubmit}>
        {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
        {passwordError && <Alert variant="error">{passwordError}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="password-current">{t.passwordCard.currentPasswordLabel.value}</Label>
          <Input
            id="password-current"
            type="password"
            value={passwords.current}
            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
            required
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="password-next">{t.passwordCard.newPasswordLabel.value}</Label>
          <Input
            id="password-next"
            type="password"
            value={passwords.next}
            onChange={e => setPasswords({ ...passwords, next: e.target.value })}
            required
          />
          <p className="text-xs text-gray-500">{t.passwordCard.newPasswordHelp.value}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-confirm">{t.passwordCard.confirmPasswordLabel.value}</Label>
          <Input
            id="password-confirm"
            type="password"
            value={passwords.confirm}
            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={passwordLoading} className="gap-2">
            {passwordLoading && <CircularProgress size={16} color="inherit" />}
            {t.passwordCard.submit.value}
          </Button>
        </div>
      </form>
    );
  };

  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;
  const displayName = profileName || user?.name || user?.email?.split('@')[0] || '—';
  const initials = getInitials(displayName);
  const avatarUrl = normalizeAvatarUrl(user?.avatarUrl);

  return (
    <div className="container-shared px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col items-center gap-2 pb-3">
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-base font-semibold"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </button>
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {(t as any).profileCard?.editPhotoLabel?.value || 'Edit photo'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow">
                      <EditIcon className="text-gray-500" fontSize="small" />
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </div>
                  {avatarMessage && <Alert variant="success">{avatarMessage}</Alert>}
                  {avatarErrorMessage && <Alert variant="error">{avatarErrorMessage}</Alert>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map(id => {
                  const Icon = sectionMeta[id].icon;
                  const isActive = id === activeSection;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:bg-gray-100',
                        isActive && 'font-semibold',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-[18px]',
                          isActive ? 'text-primary' : 'text-gray-400',
                        )}
                      >
                        <Icon className="text-[18px]" />
                      </span>
                      <span>{sectionMeta[id].title}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="lg:hidden">
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardContent className="space-y-2">
                <div className="flex justify-center pb-2">
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-base font-semibold"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </button>
                    <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {(t as any).profileCard?.editPhotoLabel?.value || 'Edit photo'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                      <EditIcon className="text-gray-500" fontSize="small" />
                    </div>
                  </div>
                </div>
                <Label htmlFor="profile-section">{t.navigation.sectionLabel.value}</Label>
                <Select
                  id="profile-section"
                  value={activeSection}
                  onChange={e => setActiveSection(normalizeSection(e.target.value))}
                >
                  {sections.map(id => (
                    <option key={id} value={id}>
                      {sectionMeta[id].title}
                    </option>
                  ))}
                </Select>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ActiveIcon className="text-[20px]" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {activeMeta.title}
                  </CardTitle>
                  {activeMeta.description && (
                    <CardDescription className="mt-1 text-sm text-gray-600">
                      {activeMeta.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">{renderSectionContent()}</CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
