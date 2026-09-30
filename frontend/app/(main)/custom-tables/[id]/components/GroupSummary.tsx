'use client';

import type { TableGroup } from '../hooks/useTableGroups';
import { formatCellNumber } from '../utils/numberFormat';
import type { CustomTableColumn } from '../utils/types';
import { numberFormatFor } from './cells/formatCell';

interface GroupSummaryProps {
  groupColumn: CustomTableColumn;
  columns: CustomTableColumn[];
  groups: TableGroup[];
  loading: boolean;
  fallbackCurrency: string;
  onPick: (key: string | null) => void;
  labels: { title: string; empty: string; rows: string; loading: string };
}

const fill = (template: string, count: number) => template.replace('{{count}}', String(count));

/** Group totals for the active "group by" column; a click filters the grid. */
export function GroupSummary({
  groupColumn,
  columns,
  groups,
  loading,
  fallbackCurrency,
  onPick,
  labels,
}: GroupSummaryProps) {
  const formatAggregate = (col: string, value: number | string | null, fn: string) => {
    const column = columns.find(c => c.key === col);
    if (typeof value !== 'number') {
      return value ?? '—';
    }
    return formatCellNumber(
      value,
      column && fn !== 'count' ? numberFormatFor(column, fallbackCurrency) : {},
    );
  };
  return (
    <section className="lumio-ct__groups" aria-label={labels.title}>
      <h3 className="lumio-ct__groups-title">
        {labels.title}: {groupColumn.title}
      </h3>
      {loading ? <p className="lumio-ct__groups-hint">{labels.loading}</p> : null}
      {!loading && groups.length === 0 ? (
        <p className="lumio-ct__groups-hint">{labels.empty}</p>
      ) : null}
      <ul className="lumio-ct__groups-list">
        {groups.map(group => (
          <li key={group.key ?? '__null'}>
            <button type="button" className="lumio-ct__group" onClick={() => onPick(group.key)}>
              <span className="lumio-ct__group-key">{group.key ?? labels.empty}</span>
              <span className="lumio-ct__group-count">{fill(labels.rows, group.count)}</span>
              {group.aggregates.map(item => (
                <span key={`${item.col}:${item.fn}`} className="lumio-ct__group-agg">
                  {columns.find(c => c.key === item.col)?.title ?? item.col}:{' '}
                  {formatAggregate(item.col, item.value, item.fn)}
                </span>
              ))}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
