'use client';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import { isDateOnly } from '../ledger.helpers';

export interface Period {
  dateFrom: string;
  dateTo: string;
}

export function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}): React.ReactElement {
  const t = useIntlayer('ledgerPage');
  const set = (patch: Partial<Period>): void => {
    const next = { ...value, ...patch };
    if (isDateOnly(next.dateFrom) && isDateOnly(next.dateTo)) {
      onChange(next);
    }
  };
  return (
    <Stack direction="row" spacing={2}>
      <TextField
        type="date"
        size="small"
        label={t.dateFrom.value}
        value={value.dateFrom}
        onChange={event => set({ dateFrom: event.target.value })}
        error={value.dateFrom > value.dateTo}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type="date"
        size="small"
        label={t.dateTo.value}
        value={value.dateTo}
        onChange={event => set({ dateTo: event.target.value })}
        error={value.dateFrom > value.dateTo}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
}
