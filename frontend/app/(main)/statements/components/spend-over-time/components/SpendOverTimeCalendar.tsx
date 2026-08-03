'use client';
import type { JSX } from 'react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { SpendOverTimeRecord } from '@/app/(main)/statements/components/spend-over-time.utils';
import { ChevronLeft, ChevronRight } from '@/app/components/icons';
import { formatMoney } from '@/app/lib/analytics-common';
import { tokens } from '@/lib/theme-tokens';

type Props = {
  records: SpendOverTimeRecord[];
  currency: string;
  onDayClick: (period: string) => void;
  labels: {
    title: string;
    emptyMonth: string;
    operations: string;
  };
};

type CalendarDay = {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  records: SpendOverTimeRecord[];
  total: number;
  currencies: string[];
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateOnly = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);
const getGridStart = (monthStart: Date): Date => {
  const day = monthStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + diff);
};

const getInitialMonth = (records: SpendOverTimeRecord[]): Date => {
  const latest = records
    .map(record => toDateOnly(record.dateValue || record.createdAt || null))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return startOfMonth(latest ?? new Date());
};

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const calendarNavButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: tokens.radius.md,
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  color: 'var(--foreground)',
  cursor: 'pointer',
};

const calendarTodayButtonStyle: React.CSSProperties = {
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: tokens.radius.md,
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 600,
};

const buildDayMap = (records: SpendOverTimeRecord[]) => {
  const map = new Map<string, SpendOverTimeRecord[]>();
  records.forEach(record => {
    const date = toDateOnly(record.dateValue || record.createdAt || null);
    if (!date) {
      return;
    }
    const iso = toIso(date);
    const current = map.get(iso) ?? [];
    current.push(record);
    map.set(iso, current);
  });
  return map;
};

export function SpendOverTimeCalendar({
  records,
  currency,
  onDayClick,
  labels,
}: Props): JSX.Element {
  const initialMonth = useMemo(() => getInitialMonth(records), [records]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  useEffect(() => {
    setVisibleMonth(initialMonth);
  }, [initialMonth]);

  const dayMap = useMemo(() => buildDayMap(records), [records]);
  const goToPreviousMonth = () => setVisibleMonth(current => addMonths(current, -1));
  const goToNextMonth = () => setVisibleMonth(current => addMonths(current, 1));
  const goToLatestMonth = () => setVisibleMonth(initialMonth);

  const days = useMemo<CalendarDay[]>(() => {
    const monthStart = startOfMonth(visibleMonth);
    const gridStart = getGridStart(monthStart);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );
      const iso = toIso(date);
      const dayRecords = [...(dayMap.get(iso) ?? [])].sort((a, b) => b.amount - a.amount);
      const currencies = Array.from(
        new Set(dayRecords.map(record => record.currencyValue).filter(Boolean)),
      );
      return {
        iso,
        dayNumber: date.getDate(),
        inCurrentMonth:
          date.getMonth() === visibleMonth.getMonth() &&
          date.getFullYear() === visibleMonth.getFullYear(),
        records: dayRecords,
        total: Number(dayRecords.reduce((sum, record) => sum + record.amount, 0).toFixed(2)),
        currencies,
      };
    });
  }, [dayMap, visibleMonth]);

  const hasRecordsInMonth = days.some(day => day.inCurrentMonth && day.records.length > 0);

  return (
    <section
      style={{
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        borderRadius: tokens.radius.xl,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--foreground)' }}>
            {labels.title}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted-foreground)' }}>
            {monthFormatter.format(visibleMonth)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            style={calendarNavButtonStyle}
          >
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={goToLatestMonth} style={calendarTodayButtonStyle}>
            Latest
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            style={calendarNavButtonStyle}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 10,
        }}
      >
        {WEEKDAY_LABELS.map(label => (
          <div
            key={label}
            style={{
              padding: '0 4px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {days.map(day => {
          const hasItems = day.records.length > 0;
          const totalLabel =
            day.currencies.length === 1
              ? formatMoney(day.total, day.currencies[0] || currency)
              : `${day.records.length} ${labels.operations}`;

          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => hasItems && onDayClick(day.iso)}
              style={{
                minHeight: 156,
                padding: 12,
                borderRadius: tokens.radius.lg,
                border: day.inCurrentMonth
                  ? '1px solid var(--border-color)'
                  : '1px dashed rgba(255,255,255,0.06)',
                background: hasItems
                  ? 'rgba(92,196,98,0.1)'
                  : day.inCurrentMonth
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(255,255,255,0.01)',
                color: 'var(--foreground)',
                textAlign: 'left',
                cursor: hasItems ? 'pointer' : 'default',
                opacity: day.inCurrentMonth ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{day.dayNumber}</span>
                {hasItems ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--primary)',
                    }}
                  >
                    {totalLabel}
                  </span>
                ) : null}
              </div>

              {hasItems ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {day.records.slice(0, 3).map(record => (
                    <div
                      key={record.id}
                      style={{
                        borderRadius: tokens.radius.md,
                        background: 'rgba(255,255,255,0.04)',
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.merchant || record.fileName}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        {formatMoney(record.amount, record.currencyValue || currency)}
                      </div>
                    </div>
                  ))}
                  {day.records.length > 3 ? (
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                      +{day.records.length - 3} more
                    </span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {!hasRecordsInMonth ? (
        <div
          style={{
            marginTop: 16,
            borderRadius: tokens.radius.lg,
            border: '1px dashed var(--border-color)',
            padding: 20,
            textAlign: 'center',
            color: 'var(--muted-foreground)',
          }}
        >
          {labels.emptyMonth}
        </div>
      ) : null}
    </section>
  );
}
