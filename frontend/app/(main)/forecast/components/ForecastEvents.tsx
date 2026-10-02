'use client';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import { useIntlayer } from '@/app/i18n';
import { formatStoredDateWithOptions } from '@/app/lib/user-format-store';
import type { ForecastEvent, ForecastEventKind } from '../hooks/useForecast';

const KIND_KEYS: Record<ForecastEventKind, string> = {
  payable: 'kindPayable',
  subscription: 'kindSubscription',
  invoice: 'kindInvoice',
  goal: 'kindGoal',
  income: 'kindIncome',
  scenario: 'kindScenario',
};

interface ForecastEventsProps {
  events: ForecastEvent[];
  excluded: string[];
  onToggle: (sourceId: string) => void;
  formatAmount: (value: number) => string;
  limit?: number;
}

/**
 * The dated items behind the curve, each with a checkbox: unticking one
 * asks "what if without it" and the curve answers.
 */
export function ForecastEvents({
  events,
  excluded,
  onToggle,
  formatAmount,
  limit = 40,
}: ForecastEventsProps) {
  const t = useIntlayer('forecastPage');
  // Excluded sources are gone from the response, so they are listed from memory to allow re-ticking.
  const rows = events.slice(0, limit);

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.5 }}>
      {rows.map(event => (
        <Box
          component="li"
          key={`${event.sourceId}:${event.date}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Checkbox
            size="small"
            checked={!excluded.includes(event.sourceId)}
            onChange={() => onToggle(event.sourceId)}
            disabled={event.kind === 'scenario'}
            inputProps={{ 'aria-label': event.label }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {event.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatStoredDateWithOptions(event.date, { day: 'numeric', month: 'short' })}
              {' · '}
              {t[KIND_KEYS[event.kind] as 'kindPayable']}
              {event.isOverdue ? ` · ${t.overdue.value}` : ''}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: event.amount > 0 ? 'success.main' : 'text.primary' }}
          >
            {event.amount > 0 ? '+' : '−'}
            {formatAmount(Math.abs(event.amount))}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
