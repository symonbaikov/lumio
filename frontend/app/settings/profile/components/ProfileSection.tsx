'use client';

import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import type { DateFormatPreference } from '@/app/lib/user-format';
import { RegionalFormatFields } from '@/app/settings/profile/components/RegionalFormatFields';
import type { TimeZoneOption } from '@/app/settings/profile/profileHelpers';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FormEvent } from 'react';

type Props = {
  t: {
    profileCard: {
      nameLabel: { value: string };
      timeZoneLabel: { value: string };
      timeZoneHelp: { value: string };
      submit: { value: string };
    };
  };
  tx: (path: string[], fallback: string) => string;
  profileMessage: string | null;
  profileError: string | null;
  profileLoading: boolean;
  profileName: string;
  setProfileName: (name: string) => void;
  setProfileMessage: (msg: string | null) => void;
  setProfileError: (err: string | null) => void;
  hasProfileChanges: boolean;
  handleProfileSubmit: (e: FormEvent) => void;
  isTimeZoneModalOpen: boolean;
  setIsTimeZoneModalOpen: (open: boolean) => void;
  setTimeZoneSearch: (q: string) => void;
  selectedTimeZoneOption: TimeZoneOption;
  locale?: string | null;
  profileDateFormat: DateFormatPreference;
  setProfileDateFormat: (value: DateFormatPreference) => void;
  profileFirstDayOfWeek: number | null;
  setProfileFirstDayOfWeek: (value: number | null) => void;
};

export function ProfileSection({
  t,
  tx,
  profileMessage,
  profileError,
  profileLoading,
  profileName,
  setProfileName,
  setProfileMessage,
  setProfileError,
  hasProfileChanges,
  handleProfileSubmit,
  isTimeZoneModalOpen,
  setIsTimeZoneModalOpen,
  setTimeZoneSearch,
  selectedTimeZoneOption,
  locale,
  profileDateFormat,
  setProfileDateFormat,
  profileFirstDayOfWeek,
  setProfileFirstDayOfWeek,
}: Props) {
  return (
    <Box
      component="form"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      onSubmit={handleProfileSubmit}
    >
      {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
      {profileError && <Alert variant="error">{profileError}</Alert>}

      <Stack spacing={0.5}>
        <Typography component="label" htmlFor="profile-name" variant="body2" fontWeight={600}>
          {t.profileCard.nameLabel.value}
        </Typography>
        <TextField
          id="profile-name"
          size="small"
          value={profileName}
          onChange={e => {
            setProfileName(e.target.value);
            setProfileMessage(null);
            setProfileError(null);
          }}
          required
          fullWidth
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography
          component="label"
          htmlFor="profile-timezone-trigger"
          variant="body2"
          fontWeight={600}
        >
          {t.profileCard.timeZoneLabel.value}
        </Typography>
        <Box
          component="button"
          id="profile-timezone-trigger"
          data-testid="profile-timezone-trigger"
          type="button"
          onClick={() => {
            setIsTimeZoneModalOpen(true);
            setTimeZoneSearch('');
          }}
          aria-haspopup="dialog"
          aria-expanded={isTimeZoneModalOpen}
          sx={{
            display: 'flex',
            height: 40,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: tokens.radius.md,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 1.5,
            py: 1,
            fontSize: 14,
            color: 'text.primary',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <span>{selectedTimeZoneOption.label}</span>
          <Typography component="span" color="text.secondary" sx={{ fontSize: 12 }}>
            v
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t.profileCard.timeZoneHelp.value}
        </Typography>
      </Stack>

      <RegionalFormatFields
        tx={tx}
        locale={locale}
        dateFormat={profileDateFormat}
        setDateFormat={setProfileDateFormat}
        firstDayOfWeek={profileFirstDayOfWeek}
        setFirstDayOfWeek={setProfileFirstDayOfWeek}
      />

      {hasProfileChanges && (
        <Alert variant="warning">{tx(['profileCard', 'unsavedChanges'], 'Unsaved changes')}</Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={profileLoading || !hasProfileChanges}
          startIcon={profileLoading ? <Spinner size={16} /> : undefined}
        >
          {t.profileCard.submit.value}
        </Button>
      </Box>
    </Box>
  );
}
