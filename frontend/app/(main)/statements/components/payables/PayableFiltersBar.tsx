'use client';

import type { PayableSource, PayableStatus } from '@/app/lib/payables-api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import React from 'react';

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
          <select
            className="lumio-payable-filters__select"
            value={value.status}
            onChange={event => update('status', event.target.value as PayableStatus | 'all')}
            aria-label={labels.status}
          >
            <option value="all">{labels.allStatuses}</option>
            {Object.entries(labels.statusOptions).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>

          <select
            className="lumio-payable-filters__select"
            value={value.source}
            onChange={event => update('source', event.target.value as PayableSource | 'all')}
            aria-label={labels.source}
          >
            <option value="all">{labels.allSources}</option>
            {Object.entries(labels.sourceOptions).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>

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
