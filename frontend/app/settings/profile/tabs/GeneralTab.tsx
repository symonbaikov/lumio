'use client';

import { Palette, UserCircle } from '@/app/components/icons';
import { Alert } from '@/app/components/ui/alert';
import { useLocale } from '@/app/i18n';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import {
  AppearanceSection,
  ThemeSection,
} from '@/app/settings/profile/components/AppearanceSection';
import { AvatarUploadButton } from '@/app/settings/profile/components/AvatarUploadButton';
import { ProfileSection } from '@/app/settings/profile/components/ProfileSection';
import { SettingsAccordion } from '@/app/settings/profile/components/SettingsAccordion';
import { TimeZoneDrawer } from '@/app/settings/profile/components/TimeZoneDrawer';
import { resolveOpenSection } from '@/app/settings/profile/helpers/settings-url-state';
import { useAppearance } from '@/app/settings/profile/hooks/useAppearance';
import { useAvatarUpload } from '@/app/settings/profile/hooks/useAvatarUpload';
import { useProfileForm } from '@/app/settings/profile/hooks/useProfileForm';
import { useSettingsText } from '@/app/settings/profile/hooks/useSettingsText';
import {
  type TimeZoneOption,
  getInitials,
  resolveTimeZoneOptions,
} from '@/app/settings/profile/profileHelpers';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

import type { SettingsTabProps } from './types';

// eslint-disable-next-line max-lines-per-function
export function GeneralTab({ section, user, setUser }: SettingsTabProps): React.JSX.Element {
  const { locale } = useLocale();
  const { t, tx } = useSettingsText();
  const openSection = resolveOpenSection('general', section);

  const [isTimeZoneModalOpen, setIsTimeZoneModalOpen] = useState(false);
  const [timeZoneSearch, setTimeZoneSearch] = useState('');
  const timeZoneOptions = useMemo(() => resolveTimeZoneOptions(), []);

  const {
    profileName,
    setProfileName,
    profileTimeZone,
    setProfileTimeZone,
    profileDateFormat,
    setProfileDateFormat,
    profileFirstDayOfWeek,
    setProfileFirstDayOfWeek,
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
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
  } = useAppearance(user, setUser, {
    successFallback: t.appearanceCard.title.value,
    errorFallback: t.profileCard.errorFallback.value,
  });

  const timeZoneSelectOptions = useMemo<TimeZoneOption[]>(() => {
    const autoLabel = t.profileCard.timeZones.auto.value;
    const utcLabel = t.profileCard.timeZones.utc.value;
    return [
      { value: '', label: autoLabel },
      ...timeZoneOptions.map(zone => ({ value: zone, label: zone === 'UTC' ? utcLabel : zone })),
    ];
  }, [t, timeZoneOptions]);

  const selectedTimeZoneOption = useMemo<TimeZoneOption>(() => {
    const matched = timeZoneSelectOptions.find(option => option.value === profileTimeZone);
    if (matched) return matched;
    if (profileTimeZone) return { value: profileTimeZone, label: profileTimeZone };
    return timeZoneSelectOptions[0] || { value: '', label: t.profileCard.timeZones.auto.value };
  }, [profileTimeZone, t, timeZoneSelectOptions]);

  const filteredTimeZoneSelectOptions = useMemo(() => {
    const query = timeZoneSearch.trim().toLowerCase();
    if (!query) return timeZoneSelectOptions;
    return timeZoneSelectOptions.filter(option => option.label.toLowerCase().includes(query));
  }, [timeZoneSearch, timeZoneSelectOptions]);

  const handleTimeZoneChange = useCallback(
    (value: string) => {
      setProfileTimeZone(value);
      setProfileMessage(null);
      setProfileError(null);
      setIsTimeZoneModalOpen(false);
    },
    [setProfileTimeZone, setProfileMessage, setProfileError],
  );

  const displayName = profileName || user?.name || user?.email?.split('@')[0] || '—';
  const initials = getInitials(displayName);
  const avatarUrl = normalizeAvatarUrl(user?.avatarUrl);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          >
            <AvatarUploadButton
              avatarUrl={avatarUrl}
              displayName={displayName}
              initials={initials}
              showImage={!avatarError}
              disabled={avatarUploading}
              inputRef={avatarInputRef}
              onSelect={handleAvatarSelect}
              onImageError={() => setAvatarError(true)}
            />
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
                {displayName}
              </Typography>
              {user?.email ? (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          {avatarMessage ? (
            <Alert variant="success" style={{ marginTop: 16 }}>
              {avatarMessage}
            </Alert>
          ) : null}
          {avatarErrorMessage ? (
            <Alert variant="error" style={{ marginTop: 16 }}>
              {avatarErrorMessage}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <ThemeSection
        t={t}
        tx={tx}
        appearanceMessage={appearanceMessage}
        appearanceError={appearanceError}
        appearanceLoading={appearanceLoading}
        themePreference={themePreference}
        handleThemePreferenceChange={handleThemePreferenceChange}
      />

      <SettingsAccordion
        id="profile"
        title={t.profileCard.title.value}
        icon={UserCircle}
        defaultExpanded={openSection === 'profile'}
      >
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
          locale={locale}
          profileDateFormat={profileDateFormat}
          setProfileDateFormat={setProfileDateFormat}
          profileFirstDayOfWeek={profileFirstDayOfWeek}
          setProfileFirstDayOfWeek={setProfileFirstDayOfWeek}
        />
      </SettingsAccordion>

      <SettingsAccordion
        id="appearance"
        title={tx(['appearanceCard', 'detailsTitle'], 'Density & motion')}
        description={t.appearanceCard.description.value}
        icon={Palette}
        defaultExpanded={openSection === 'appearance'}
      >
        <AppearanceSection
          tx={tx}
          density={density}
          setDensity={setDensity}
          reduceMotion={reduceMotion}
          setReduceMotion={setReduceMotion}
        />
      </SettingsAccordion>

      <TimeZoneDrawer
        isOpen={isTimeZoneModalOpen}
        onClose={() => {
          setIsTimeZoneModalOpen(false);
          setTimeZoneSearch('');
        }}
        search={timeZoneSearch}
        onSearchChange={setTimeZoneSearch}
        options={filteredTimeZoneSelectOptions}
        selectedValue={selectedTimeZoneOption.value}
        onSelect={handleTimeZoneChange}
        labels={{
          title: t.profileCard.timeZoneLabel.value,
          placeholder: t.profileCard.timeZones.auto.value,
          help: t.profileCard.timeZoneHelp.value,
        }}
      />
    </Stack>
  );
}
