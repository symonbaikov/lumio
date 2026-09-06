'use client';

import { Chip, ChipGroup } from '@/app/components/dashboard/ui';
import { ChevronLeft, ChevronRight } from '@/app/components/icons';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { resolveLocale } from '../helpers/dashboard-helpers';
import { isFutureMonth } from '../helpers/dashboard-url-state';

export interface MonthStripLabels {
  group: string;
  previousYear: string;
  nextYear: string;
}

export interface MonthStripProps {
  displayMonth: Date;
  onChange: (year: number, month: number) => void;
  locale: string;
  labels: MonthStripLabels;
  /** Injectable clock for tests. */
  now?: Date;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index);

function useMonthNames(locale: string): string[] {
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(resolveLocale(locale), { month: 'short' });
    return MONTHS.map(month => formatter.format(new Date(2000, month, 1)));
  }, [locale]);
}

/** Jan…Dec chips for one year plus a ‹ year › stepper; future months are disabled. */
export function MonthStrip({
  displayMonth,
  onChange,
  locale,
  labels,
  now = new Date(),
}: MonthStripProps): React.JSX.Element {
  const year = displayMonth.getFullYear();
  const activeMonth = displayMonth.getMonth();
  const monthNames = useMonthNames(locale);
  const groupRef = useRef<HTMLDivElement>(null);

  // Keep the active chip visible when the strip scrolls horizontally (mobile).
  useEffect(() => {
    const group = groupRef.current;
    const chip = group?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!group || !chip || group.scrollWidth <= group.clientWidth) {
      return;
    }
    group.scrollLeft = chip.offsetLeft - group.clientWidth / 2 + chip.offsetWidth / 2;
  }, [activeMonth, year]);

  const stepYear = (delta: number): void => {
    const nextYear = year + delta;
    const month = isFutureMonth(nextYear, activeMonth, now) ? now.getMonth() : activeMonth;
    onChange(nextYear, month);
  };

  return (
    <div className="lumio-dashboard__month-strip">
      <ChipGroup
        ref={groupRef}
        scroll
        aria-label={labels.group}
        className="lumio-dashboard__month-chips"
      >
        {MONTHS.map(month => {
          const future = isFutureMonth(year, month, now);
          return (
            <Chip
              key={month}
              active={month === activeMonth}
              disabled={future}
              muted={future}
              onClick={() => onChange(year, month)}
            >
              {monthNames[month]}
            </Chip>
          );
        })}
      </ChipGroup>
      <div className="lumio-dashboard__year-stepper">
        <button
          type="button"
          className="lumio-dashboard__year-btn"
          aria-label={labels.previousYear}
          onClick={() => stepYear(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="lumio-dashboard__year-value">{year}</span>
        <button
          type="button"
          className="lumio-dashboard__year-btn"
          aria-label={labels.nextYear}
          disabled={year >= now.getFullYear()}
          onClick={() => stepYear(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
