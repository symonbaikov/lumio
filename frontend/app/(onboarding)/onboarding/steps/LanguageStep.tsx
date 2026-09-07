'use client';

import { Select } from '@/app/components/ui/select';
import { useIntlayer } from '@/app/i18n';
import { SUPPORTED_LOCALES } from '@/app/lib/locale';
import { tokens } from '@/lib/theme-tokens';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Asia/Almaty',
  'Asia/Astana',
  'Asia/Tashkent',
  'Europe/Berlin',
  'America/New_York',
];

const resolveTimeZoneOptions = (): string[] => {
  const supportedValuesOf = (
    globalThis.Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    }
  ).supportedValuesOf;

  if (typeof supportedValuesOf === 'function') {
    try {
      const zones = supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) {
        return zones;
      }
    } catch {
      // Fallback below
    }
  }

  return COMMON_TIMEZONES;
};

interface LanguageStepProps {
  locale: SupportedLocale;
  timeZone: string | null;
  onLocaleChange: (locale: SupportedLocale) => void;
  onTimeZoneChange: (timeZone: string | null) => void;
}

type TimeZoneOption = {
  value: string;
  label: string;
};

// eslint-disable-next-line max-params
type TextFn = (path: string[], fallback?: string) => string;

interface LanguageStepData {
  text: TextFn;
  timezoneSelectOptions: TimeZoneOption[];
  selectedTimeZoneOption: TimeZoneOption | null;
  languageOptions: Array<{ value: SupportedLocale; label: string }>;
}

function useLanguageStepData(props: LanguageStepProps): LanguageStepData {
  const { locale, timeZone } = props;
  const t = useIntlayer('onboardingPage');
  // eslint-disable-next-line max-params
  const text: TextFn = (path, fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback, locale);

  const timeZoneOptions = useMemo(() => resolveTimeZoneOptions(), []);
  const timezoneSelectOptions = useMemo<TimeZoneOption[]>(
    () => timeZoneOptions.map(zone => ({ value: zone, label: zone })),
    [timeZoneOptions],
  );

  const selectedTimeZoneOption = useMemo<TimeZoneOption | null>(() => {
    if (!timeZone) {
      return null;
    }
    const match = timezoneSelectOptions.find(option => option.value === timeZone);
    return match ?? { value: timeZone, label: timeZone };
  }, [timeZone, timezoneSelectOptions]);

  const languageOptions: Array<{ value: SupportedLocale; label: string }> = SUPPORTED_LOCALES.map(
    code => ({
      value: code,
      label: text(['language', 'localeOptions', code], code),
    }),
  );

  return { text, timezoneSelectOptions, selectedTimeZoneOption, languageOptions };
}

const makeLabelStyle = (color: string) => ({
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  color,
});

function LanguageHeader({ text }: { text: TextFn }): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const textSecondary =
    resolvedTheme === 'dark' ? tokens.dark.color.textSecondary : tokens.color.textSecondary;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
        {text(['language', 'title'], 'Language and timezone')}
      </h2>
      <p style={{ marginTop: 8, fontSize: 14, color: textSecondary }}>
        {text(
          ['language', 'subtitle'],
          'Choose your preferred interface language and timezone for accurate report timestamps.',
        )}
      </p>
    </div>
  );
}

interface LocaleSelectorProps {
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  languageOptions: Array<{ value: SupportedLocale; label: string }>;
  label: string;
}

function LocaleSelector(props: LocaleSelectorProps): React.ReactElement {
  const { locale, onLocaleChange, languageOptions, label } = props;
  const { resolvedTheme } = useTheme();
  const textSecondary =
    resolvedTheme === 'dark' ? tokens.dark.color.textSecondary : tokens.color.textSecondary;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onLocaleChange(event.target.value as SupportedLocale);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={makeLabelStyle(textSecondary)} htmlFor="onboarding-locale">
        {label}
      </label>
      <Select id="onboarding-locale" value={locale} onChange={handleChange}>
        {languageOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface TimeZoneSelectorProps {
  selectedTimeZoneOption: TimeZoneOption | null;
  timezoneSelectOptions: TimeZoneOption[];
  onTimeZoneChange: (timeZone: string | null) => void;
  label: string;
  noOptionsText: string;
  placeholder: string;
  hint: string;
}

function buildRenderInput(placeholder: string): (params: object) => React.ReactElement {
  return (params: object): React.ReactElement => {
    const p = params as React.ComponentProps<typeof TextField>;
    return (
      <TextField
        {...p}
        inputProps={{ ...(p.inputProps as object), id: 'onboarding-timezone-select' }}
        size="small"
        placeholder={placeholder}
      />
    );
  };
}

function TimeZoneSelector(props: TimeZoneSelectorProps): React.ReactElement {
  const {
    selectedTimeZoneOption,
    timezoneSelectOptions,
    onTimeZoneChange,
    label,
    noOptionsText,
    placeholder,
    hint,
  } = props;
  const { resolvedTheme } = useTheme();
  const textSecondary =
    resolvedTheme === 'dark' ? tokens.dark.color.textSecondary : tokens.color.textSecondary;

  // eslint-disable-next-line max-params
  const handleChange = (_event: React.SyntheticEvent, option: TimeZoneOption | null): void => {
    onTimeZoneChange(option?.value ?? null);
  };

  const getOptionLabel = (option: TimeZoneOption): string => option.label;
  // eslint-disable-next-line max-params
  const isOptionEqualToValue = (a: TimeZoneOption, b: TimeZoneOption): boolean =>
    a.value === b.value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={makeLabelStyle(textSecondary)} htmlFor="onboarding-timezone-select">
        {label}
      </label>
      <Autocomplete<TimeZoneOption, false>
        options={timezoneSelectOptions}
        value={selectedTimeZoneOption}
        onChange={handleChange}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        noOptionsText={noOptionsText}
        renderInput={buildRenderInput(placeholder)}
      />
      <p style={{ fontSize: 14, color: textSecondary, margin: 0 }}>{hint}</p>
    </div>
  );
}

export function LanguageStep(props: LanguageStepProps): React.ReactElement {
  const { locale, onLocaleChange, onTimeZoneChange } = props;
  const { text, timezoneSelectOptions, selectedTimeZoneOption, languageOptions } =
    useLanguageStepData(props);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <LanguageHeader text={text} />
      <LocaleSelector
        locale={locale}
        onLocaleChange={onLocaleChange}
        languageOptions={languageOptions}
        label={text(['language', 'localeLabel'], 'Language')}
      />
      <TimeZoneSelector
        selectedTimeZoneOption={selectedTimeZoneOption}
        timezoneSelectOptions={timezoneSelectOptions}
        onTimeZoneChange={onTimeZoneChange}
        label={text(['language', 'timeZoneLabel'], 'Timezone')}
        noOptionsText={text(['language', 'timeZoneNoOptions'], 'No matching timezones found')}
        placeholder={text(['language', 'timeZonePlaceholder'], 'Select timezone')}
        hint={text(
          ['language', 'timeZoneHint'],
          'You can always change this later in profile settings.',
        )}
      />
    </section>
  );
}
