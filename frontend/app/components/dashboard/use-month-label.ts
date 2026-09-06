import { resolveLocale } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { useLocale } from '@/app/i18n';
import { useMemo } from 'react';

/** "August 2026" in the active UI locale. */
export function useMonthLabel(displayMonth: Date): string {
  const { locale } = useLocale();
  return useMemo(
    () =>
      new Intl.DateTimeFormat(resolveLocale(locale), { month: 'long', year: 'numeric' }).format(
        displayMonth,
      ),
    [locale, displayMonth],
  );
}
