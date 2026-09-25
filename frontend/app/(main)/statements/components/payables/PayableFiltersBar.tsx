'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import React from 'react';
import { Select } from '@/app/components/ui/select';
import type { PayableSource, PayableStatus } from '@/app/lib/payables-api';

const toDate = (s: string): Date | null => {
  if (!s) {
    return null;
  }
  const d = parseISO(s);
  return isValid(d) ? d : null;
};
const toStr = (d: Date | null): string => (d && isValid(d) ? format(d, 'yyyy-MM-dd') : '');

import { X } from '@/app/components/icons';
import { Button } from '@/app/components/ui/button';
import type { PayablesFiltersState } from './payables-utils';

interface PayableFiltersBarProps {
  value: PayablesFiltersState;
  onChange: (next: PayablesFiltersState) => void;
  onReset: () => void;
  labels: {
    status: string;
    source: string;
    dueFrom: string;
    dueTo: string;
    reset: string;
    allStatuses: string;
    allSources: string;
    statusOptions: Record<PayableStatus, string>;
    sourceOptions: Record<PayableSource, string>;
  };
}

// eslint-disable-next-line max-lines-per-function
function PayableFiltersBar({
  value,
  onChange,
  onReset,
  labels,
}: PayableFiltersBarProps): React.JSX.Element {
  const update = <K extends keyof PayablesFiltersState>(
    key: K,
    nextValue: PayablesFiltersState[K],
  ): void => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="lumio-payable-filters">
      <div className="lumio-payable-filters__inner">
        <div className="lumio-payable-filters__grid">
          <Select
            fullWidth
            size="small"
            value={value.status}
            onChange={next => update('status', next as PayableStatus | 'all')}
            inputProps={{ 'aria-label': labels.status }}
            options={[
              { value: 'all', label: labels.allStatuses },
              ...Object.entries(labels.statusOptions).map(([optionValue, optionLabel]) => ({
                value: optionValue,
                label: optionLabel,
              })),
            ]}
          />

          <Select
            fullWidth
            size="small"
            value={value.source}
            onChange={next => update('source', next as PayableSource | 'all')}
            inputProps={{ 'aria-label': labels.source }}
            options={[
              { value: 'all', label: labels.allSources },
              ...Object.entries(labels.sourceOptions).map(([optionValue, optionLabel]) => ({
                value: optionValue,
                label: optionLabel,
              })),
            ]}
          />

          <DatePicker
            label={labels.dueFrom}
            value={toDate(value.dueDateFrom)}
            onChange={(d: Date | null) => update('dueDateFrom', toStr(d))}
            slotProps={{ textField: { size: 'small' } as never }}
          />

          <DatePicker
            label={labels.dueTo}
            value={toDate(value.dueDateTo)}
            onChange={(d: Date | null) => update('dueDateTo', toStr(d))}
            slotProps={{ textField: { size: 'small' } as never }}
          />
        </div>

        <Button variant="ghost" onClick={onReset} style={{ flexShrink: 0 }}>
          <X size={16} />
          {labels.reset}
        </Button>
      </div>
    </div>
  );
}

export default PayableFiltersBar;
