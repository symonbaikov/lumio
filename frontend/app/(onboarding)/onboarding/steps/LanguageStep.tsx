'use client';

import { Select } from '@/app/components/ui/select';
import { useIntlayer } from 'next-intlayer';
import { useMemo } from 'react';
import ReactSelect, { type StylesConfig } from 'react-select';
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

const resolveTimeZoneOptions = () => {
  if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
    try {
      const zones = (Intl as any).supportedValuesOf('timeZone') as string[];
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

function toText(token: unknown, fallback = ''): string {
  if (typeof token === 'string') {
    return token;
  }

  if (token && typeof token === 'object' && 'value' in token) {
    const value = (token as { value?: unknown }).value;
    if (typeof value === 'string') {
      return value;
    }
  }

  if (token !== null && token !== undefined) {
    const stringified = String(token);
    if (stringified && stringified !== '[object Object]') {
      return stringified;
    }
  }

  return fallback;
}

export function LanguageStep({
  locale,
  timeZone,
  onLocaleChange,
  onTimeZoneChange,
}: LanguageStepProps) {
  const t = useIntlayer('onboardingPage' as any) as any;
  const timeZoneOptions = useMemo(resolveTimeZoneOptions, []);
  const timezoneSelectOptions = useMemo<TimeZoneOption[]>(
    () => timeZoneOptions.map(zone => ({ value: zone, label: zone })),
    [timeZoneOptions],
  );

  const selectedTimeZoneOption = useMemo<TimeZoneOption | null>(() => {
    if (!timeZone) {
      return null;
    }

    const match = timezoneSelectOptions.find(option => option.value === timeZone);
    if (match) {
      return match;
    }

    return { value: timeZone, label: timeZone };
  }, [timeZone, timezoneSelectOptions]);

  const languageOptions: Array<{ value: SupportedLocale; label: string }> = [
    { value: 'ru', label: t.language.localeOptions.ru.value },
    { value: 'en', label: t.language.localeOptions.en.value },
    { value: 'kk', label: t.language.localeOptions.kk.value },
  ];

  const timezoneSelectStyles = useMemo<StylesConfig<TimeZoneOption, false>>(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 40,
        borderRadius: 8,
        borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        backgroundColor: 'hsl(var(--card))',
        boxShadow: state.isFocused ? 'inset 0 0 0 2px hsl(var(--primary) / 0.28)' : '0 0 #0000',
        ':hover': {
          borderColor: 'hsl(var(--primary))',
        },
      }),
      valueContainer: base => ({
        ...base,
        padding: '0 12px',
      }),
      placeholder: base => ({
        ...base,
        color: 'hsl(var(--muted-foreground))',
      }),
      singleValue: base => ({
        ...base,
        color: 'hsl(var(--foreground))',
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      menu: base => ({
        ...base,
        position: 'static',
        marginTop: 8,
        borderRadius: 12,
        border: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--card))',
        boxShadow: 'none',
      }),
      menuList: base => ({
        ...base,
        maxHeight: 'min(24vh, 180px)',
        padding: 4,
      }),
      option: (base, state) => ({
        ...base,
        borderRadius: 8,
        backgroundColor: state.isSelected
          ? 'hsl(var(--primary) / 0.12)'
          : state.isFocused
            ? 'hsl(var(--muted))'
            : 'transparent',
        color: state.isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        cursor: 'pointer',
      }),
    }),
    [],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t.language.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.language.subtitle}</p>
      </div>

      <div className="space-y-3">
        <label
          className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          htmlFor="onboarding-locale"
        >
          {t.language.localeLabel}
        </label>
        <Select
          id="onboarding-locale"
          value={locale}
          onChange={event => onLocaleChange(event.target.value as SupportedLocale)}
        >
          {languageOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <label
          className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          htmlFor="onboarding-timezone-select"
        >
          {t.language.timeZoneLabel}
        </label>

        <ReactSelect<TimeZoneOption, false>
          inputId="onboarding-timezone-select"
          options={timezoneSelectOptions}
          value={selectedTimeZoneOption}
          onChange={option => onTimeZoneChange(option?.value || null)}
          placeholder={toText(t.language.timeZonePlaceholder, 'Select timezone')}
          noOptionsMessage={() =>
            toText(t.language.timeZoneNoOptions, 'No matching timezones found')
          }
          isSearchable
          menuPlacement="auto"
          menuShouldScrollIntoView={false}
          styles={timezoneSelectStyles}
        />

        <p className="text-sm text-muted-foreground">{t.language.timeZoneHint}</p>
      </div>
    </section>
  );
}
