/* eslint-disable max-lines */
'use client';

import { Alert } from '@/app/components/ui/alert';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Select as UiSelect } from '@/app/components/ui/select';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import { AppearanceSection } from '@/app/settings/profile/components/AppearanceSection';
import { ChangelogSection } from '@/app/settings/profile/components/ChangelogSection';
import { EmailSection } from '@/app/settings/profile/components/EmailSection';
import { NotificationsSection } from '@/app/settings/profile/components/NotificationsSection';
import { PasswordSection } from '@/app/settings/profile/components/PasswordSection';
import { ProfileSection } from '@/app/settings/profile/components/ProfileSection';
import { SessionsSection } from '@/app/settings/profile/components/SessionsSection';
import { SyncSection } from '@/app/settings/profile/components/SyncSection';
import { useAppearance } from '@/app/settings/profile/hooks/useAppearance';
import { useAvatarUpload } from '@/app/settings/profile/hooks/useAvatarUpload';
import { useChangelog } from '@/app/settings/profile/hooks/useChangelog';
import { useEmailForm } from '@/app/settings/profile/hooks/useEmailForm';
import { useNotifications } from '@/app/settings/profile/hooks/useNotifications';
import { usePasswordForm } from '@/app/settings/profile/hooks/usePasswordForm';
import { useProfileForm } from '@/app/settings/profile/hooks/useProfileForm';
import { useSessions } from '@/app/settings/profile/hooks/useSessions';
import { useSync } from '@/app/settings/profile/hooks/useSync';
import {
  type SectionId,
  type TimeZoneOption,
  getInitials,
  normalizeSection,
  resolveTimeZoneOptions,
  sections,
} from '@/app/settings/profile/profileHelpers';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Bell, Check, Clock, Cloud, Lock, Mail, Palette, Pencil, Search, Shield, UserCircle } from '@/app/components/icons';
import React, { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';

// eslint-disable-next-line max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export default function ProfileSettingsPage() {
  const { user, loading, setUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const { locale } = useLocale();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const t = useIntlayer('settingsProfilePage');
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [isTimeZoneModalOpen, setIsTimeZoneModalOpen] = useState(false);
  const [timeZoneSearch, setTimeZoneSearch] = useState('');
  const timeZoneOptions = useMemo(resolveTimeZoneOptions, []);
  const tx = useCallback(
    // eslint-disable-next-line max-params
    (path: string[], fallback: string): string => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );

  const isAuthenticated = useMemo(() => !!user, [user]);

  const {
    profileName,
    setProfileName,
    profileTimeZone,
    setProfileTimeZone,
    profileMessage,
    setProfileMessage,
    profileError,
    setProfileError,
    profileLoading,
    hasProfileChanges,
    handleProfileSubmit,
  } = useProfileForm(user, setUser, {
    successFallback: t.profileCard.successFallback.value,
    errorFallback: t.profileCard.errorFallback.value,
  });

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    sessionsMessage,
    logoutSessionLoadingId,
    handleLogoutSession,
    handleLogoutAll,
  } = useSessions(isAuthenticated, activeSection, {
    loadError: tx(['sessionsCard', 'sessionsLoadError'], 'Failed to load sessions'),
    logoutAllConfirm: tx(
      ['sessionsCard', 'logoutAllConfirm'],
      'Log out of all devices? You will need to sign in again on each device.',
    ),
    logoutCurrentConfirm: tx(
      ['sessionsCard', 'logoutCurrentConfirm'],
      'Log out on this device? You will need to sign in again.',
    ),
    logoutSessionConfirm: tx(
      ['sessionsCard', 'logoutSessionConfirm'],
      'Log out this device session?',
    ),
    sessionLogoutSuccess: tx(['sessionsCard', 'sessionLogoutSuccess'], 'Session logged out'),
    sessionLogoutError: tx(['sessionsCard', 'sessionLogoutError'], 'Failed to log out session'),
  });

  const {
    notificationPreferences,
    notificationsLoading,
    notificationSavingKey,
    notificationError,
    notificationMessage,
    toggleNotificationPreference,
  } = useNotifications(isAuthenticated, activeSection, {
    loadError: tx(['notificationsCard', 'errors', 'load'], ''),
    saveError: tx(['notificationsCard', 'errors', 'save'], ''),
    savedMessage: tx(['notificationsCard', 'messages', 'saved'], ''),
  });

  const timeZoneSelectOptions = useMemo<TimeZoneOption[]>(() => {
    const autoLabel = t.profileCard.timeZones.auto.value;
    const utcLabel = t.profileCard.timeZones.utc.value;

    return [
      { value: '', label: autoLabel },
      ...timeZoneOptions.map(zone => ({
        value: zone,
        label: zone === 'UTC' ? utcLabel : zone,
      })),
    ];
  }, [t, timeZoneOptions]);

  const selectedTimeZoneOption = useMemo<TimeZoneOption>(() => {
    const matched = timeZoneSelectOptions.find(option => option.value === profileTimeZone);
    if (matched) {
      return matched;
    }

    if (profileTimeZone) {
      return { value: profileTimeZone, label: profileTimeZone };
    }

    return timeZoneSelectOptions[0] || { value: '', label: t.profileCard.timeZones.auto.value };
  }, [profileTimeZone, t, timeZoneSelectOptions]);

  const handleTimeZoneChange = useCallback((value: string) => {
    setProfileTimeZone(value);
    setProfileMessage(null);
    setProfileError(null);
    setIsTimeZoneModalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTimeZoneSelectOptions = useMemo(() => {
    const query = timeZoneSearch.trim().toLowerCase();
    if (!query) {
      return timeZoneSelectOptions;
    }

    return timeZoneSelectOptions.filter(option => option.label.toLowerCase().includes(query));
  }, [timeZoneSearch, timeZoneSelectOptions]);

  const {
    avatarError,
    setAvatarError,
    avatarUploading,
    avatarMessage,
    avatarErrorMessage,
    avatarInputRef,
    handleAvatarSelect,
  } = useAvatarUpload(user, setUser, {
    sizeError: tx(['profileCard', 'avatarSizeError'], 'Avatar file is too large'),
    updated: tx(['profileCard', 'avatarUpdated'], 'Avatar updated'),
    errorFallback: tx(['profileCard', 'avatarError'], 'Failed to update avatar'),
  });

  const {
    themePreference,
    appearanceMessage,
    appearanceError,
    appearanceLoading,
    handleThemePreferenceChange,
  } = useAppearance(user, setUser, {
    successFallback: t.appearanceCard.title.value,
    errorFallback: t.profileCard.errorFallback.value,
  });

  const {
    email,
    setEmail,
    emailPassword,
    setEmailPassword,
    emailMessage,
    emailError,
    emailLoading,
    handleEmailSubmit,
  } = useEmailForm(user, {
    passwordRequired: t.validation.passwordRequiredForEmail.value,
    successFallback: t.emailCard.successFallback.value,
    errorFallback: t.emailCard.errorFallback.value,
  });

  const {
    passwords,
    setPasswords,
    passwordMessage,
    passwordError,
    passwordLoading,
    handlePasswordSubmit,
  } = usePasswordForm({
    mismatch: t.validation.passwordMismatch.value,
    confirmSubmit: tx(
      ['passwordCard', 'confirmSubmit'],
      'Update password now? You may need to sign in again on other devices.',
    ),
    successFallback: t.passwordCard.successFallback.value,
    errorFallback: t.passwordCard.errorFallback.value,
  });

  const workspaceReady = !!(currentWorkspace && !workspaceLoading);
  const { changelogEntries, changelogLoading, changelogSelectedEntry, setChangelogSelectedEntry } =
    useChangelog(isAuthenticated, activeSection, workspaceReady);

  const { bankStats, totalCount, statsLoading, downloading, errorMessage: syncError, handleExportZip } =
    useSync();

  useEffect(() => {
    setActiveSection(normalizeSection(window.location.hash?.replace('#', '')));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeSection}`);
  }, [activeSection]);

  if (loading) {
    return (
      <Box className="container-shared" sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 8 }}>
        <Spinner size={32} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box className="container-shared" sx={{ px: 2, py: 5 }}>
        <Alert style={{ maxWidth: 576 }} variant="default">
          {t.authRequired.value}
        </Alert>
      </Box>
    );
  }

  const sectionMeta: Record<
    SectionId,
    {
      title: string;
      description?: string;
      icon: ComponentType<{ size?: number; className?: string }>;
    }
  > = {
    profile: { title: t.profileCard.title.value, icon: UserCircle },
    appearance: {
      title: t.appearanceCard.title.value,
      description: t.appearanceCard.description.value,
      icon: Palette,
    },
    sessions: {
      title: t.sessionsCard.title.value,
      description: t.sessionsCard.logoutAllHelp.value,
      icon: Shield,
    },
    email: { title: t.emailCard.title.value, icon: Mail },
    password: { title: t.passwordCard.title.value, icon: Lock },
    notifications: {
      title: tx(['notificationsCard', 'title'], 'Notifications'),
      description: tx(['notificationsCard', 'description'], ''),
      icon: Bell,
    },
    changelog: {
      title: tx(['changelogCard', 'title'], 'Changelog'),
      description: tx(['changelogCard', 'description'], ''),
      icon: Clock,
    },
    sync: {
      title: tx(['syncCard', 'title'], 'Sync'),
      description: tx(['syncCard', 'description'], 'Export and sync files to your filesystem'),
      icon: Cloud,
    },
  };

  const sectionContent: Record<SectionId, React.ReactElement> = {
    profile: (
      <ProfileSection
        t={t}
        tx={tx}
        profileMessage={profileMessage}
        profileError={profileError}
        profileLoading={profileLoading}
        profileName={profileName}
        setProfileName={setProfileName}
        setProfileMessage={setProfileMessage}
        setProfileError={setProfileError}
        hasProfileChanges={hasProfileChanges}
        handleProfileSubmit={handleProfileSubmit}
        isTimeZoneModalOpen={isTimeZoneModalOpen}
        setIsTimeZoneModalOpen={setIsTimeZoneModalOpen}
        setTimeZoneSearch={setTimeZoneSearch}
        selectedTimeZoneOption={selectedTimeZoneOption}
      />
    ),
    appearance: (
      <AppearanceSection
        t={t}
        tx={tx}
        appearanceMessage={appearanceMessage}
        appearanceError={appearanceError}
        appearanceLoading={appearanceLoading}
        themePreference={themePreference}
        handleThemePreferenceChange={handleThemePreferenceChange}
      />
    ),
    sessions: (
      <SessionsSection
        t={t}
        tx={tx}
        sessionsMessage={sessionsMessage}
        sessionsError={sessionsError}
        sessionsLoading={sessionsLoading}
        sessions={sessions}
        userLastLogin={user?.lastLogin}
        logoutSessionLoadingId={logoutSessionLoadingId}
        handleLogoutSession={handleLogoutSession}
        handleLogoutAll={handleLogoutAll}
      />
    ),
    email: (
      <EmailSection
        t={t}
        email={email}
        setEmail={setEmail}
        emailPassword={emailPassword}
        setEmailPassword={setEmailPassword}
        emailMessage={emailMessage}
        emailError={emailError}
        emailLoading={emailLoading}
        handleEmailSubmit={handleEmailSubmit}
      />
    ),
    password: (
      <PasswordSection
        t={t}
        tx={tx}
        passwordMessage={passwordMessage}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        passwords={passwords}
        setPasswords={setPasswords}
        handlePasswordSubmit={handlePasswordSubmit}
      />
    ),
    notifications: (
      <NotificationsSection
        tx={tx}
        notificationError={notificationError}
        notificationMessage={notificationMessage}
        notificationsLoading={notificationsLoading}
        notificationPreferences={notificationPreferences}
        notificationSavingKey={notificationSavingKey}
        toggleNotificationPreference={toggleNotificationPreference}
      />
    ),
    changelog: (
      <ChangelogSection
        tx={tx}
        locale={locale}
        changelogEntries={changelogEntries}
        changelogLoading={changelogLoading}
        changelogSelectedEntry={changelogSelectedEntry}
        setChangelogSelectedEntry={setChangelogSelectedEntry}
      />
    ),
    sync: (
      <SyncSection
        bankStats={bankStats}
        totalCount={totalCount}
        statsLoading={statsLoading}
        downloading={downloading}
        errorMessage={syncError}
        handleExportZip={handleExportZip}
      />
    ),
  };

  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;
  const displayName = profileName || user?.name || user?.email?.split('@')[0] || '—';
  const initials = getInitials(displayName);
  const avatarUrl = normalizeAvatarUrl(user?.avatarUrl);

  return (
    <Box className="container-shared" sx={{ px: 2, py: 4 }}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { lg: '260px 1fr' } }}>
        {/* Sidebar — desktop */}
        <Box component="aside" sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ position: 'sticky', top: 96 }}>
            <Card variant="outlined">
              <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pb: 1.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      sx={{
                        display: 'flex',
                        height: 80,
                        width: 80,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: tokens.radius.full,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        p: 0,
                      }}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        display: 'flex',
                        height: 28,
                        width: 28,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: tokens.radius.full,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                      }}
                    >
                      <Pencil size={14} style={{ color: c.ink400 }} />
                    </Box>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      style={{ display: 'none' }}
                    />
                  </Box>
                  {avatarMessage && <Alert variant="success">{avatarMessage}</Alert>}
                  {avatarErrorMessage && <Alert variant="error">{avatarErrorMessage}</Alert>}
                </Box>
              </Box>
              <CardContent sx={{ pt: 0 }}>
                {/* eslint-disable-next-line max-lines-per-function */}
                {sections.map(id => {
                  const Icon = sectionMeta[id].icon;
                  const isActive = id === activeSection;
                  return (
                    <Box
                      component="button"
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 1.5,
                        borderRadius: tokens.radius.md,
                        px: 1.5,
                        py: 1.25,
                        textAlign: 'left',
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        color: 'text.primary',
                        bgcolor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          height: 32,
                          width: 32,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: tokens.radius.sm,
                          color: isActive ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        <Icon size={18} />
                      </Box>
                      <span>{sectionMeta[id].title}</span>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Main content */}
        <Box component="main" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Mobile section picker */}
          <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      sx={{
                        display: 'flex',
                        height: 48,
                        width: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: tokens.radius.full,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        p: 0,
                      }}
                    >
                      {avatarUrl && !avatarError ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        display: 'flex',
                        height: 24,
                        width: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: tokens.radius.full,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                      }}
                    >
                      <Pencil size={14} style={{ color: c.ink400 }} />
                    </Box>
                  </Box>
                </Box>
                <Typography component="label" htmlFor="profile-section" variant="body2" fontWeight={600}>
                  {t.navigation.sectionLabel.value}
                </Typography>
                <UiSelect
                  id="profile-section"
                  value={activeSection}
                  onChange={e => setActiveSection(normalizeSection(e.target.value))}
                >
                  {sections.map(id => (
                    <option key={id} value={id}>
                      {sectionMeta[id].title}
                    </option>
                  ))}
                </UiSelect>
              </CardContent>
            </Card>
          </Box>

          {/* Active section card */}
          <Card variant="outlined">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                px: 2,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  height: 44,
                  width: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0,
                  bgcolor: 'transparent',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <ActiveIcon size={20} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary' }}>
                  {activeMeta.title}
                </Typography>
                {activeMeta.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {activeMeta.description}
                  </Typography>
                )}
              </Box>
            </Box>
            <CardContent sx={{ p: { xs: 3, lg: 4 } }}>{sectionContent[activeSection]}</CardContent>
          </Card>
        </Box>
      </Box>

      <DrawerShell
        isOpen={isTimeZoneModalOpen}
        onClose={() => {
          setIsTimeZoneModalOpen(false);
          setTimeZoneSearch('');
        }}
        title={t.profileCard.timeZoneLabel.value}
        position="right"
        width="lg"
        showCloseButton={false}
      >
        <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            <Box sx={{ position: 'relative' }}>
              <Search
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: c.ink400,
                }}
              />
              <Box
                component="input"
                id="profile-timezone"
                type="text"
                value={timeZoneSearch}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTimeZoneSearch(event.target.value)}
                placeholder={t.profileCard.timeZones.auto.value}
                sx={{
                  width: '100%',
                  borderRadius: tokens.radius.md,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  py: 1.5,
                  pl: 5,
                  pr: 2,
                  fontSize: 14,
                  color: 'text.primary',
                  '&:focus': { borderColor: 'primary.main' },
                  boxSizing: 'border-box',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {filteredTimeZoneSelectOptions.length > 0 ? (
                // eslint-disable-next-line max-lines-per-function
                filteredTimeZoneSelectOptions.map(option => {
                  const isSelected = option.value === selectedTimeZoneOption.value;
                  return (
                    <Box
                      component="button"
                      key={option.value || '__auto'}
                      type="button"
                      onClick={() => handleTimeZoneChange(option.value)}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: tokens.radius.md,
                        px: 1.5,
                        py: 1.5,
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: 'none',
                        bgcolor: isSelected ? 'primary.light' : 'transparent',
                        color: isSelected ? 'primary.main' : 'text.primary',
                        '&:hover': { bgcolor: isSelected ? 'primary.light' : 'action.hover' },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <Typography component="span" sx={{ fontWeight: 500, fontSize: 14 }}>
                        {option.label}
                      </Typography>
                      {isSelected ? <Check style={{ width: 16, height: 16 }} /> : null}
                    </Box>
                  );
                })
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ borderRadius: tokens.radius.md, bgcolor: 'background.paper', px: 1.5, py: 1.5 }}
                >
                  No time zones found
                </Typography>
              )}
            </Box>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
          >
            {t.profileCard.timeZoneHelp.value}
          </Typography>
        </Box>
      </DrawerShell>
    </Box>
  );
}
