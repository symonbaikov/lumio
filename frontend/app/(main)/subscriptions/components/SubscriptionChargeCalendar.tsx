'use client';

import type { ReactNode } from 'react';
import type { SubscriptionChargeCalendar } from '../hooks/useSubscriptionsPage';
import { cellIntensity, monthPeaks } from './charge-calendar.utils';

interface SubscriptionChargeCalendarProps {
  calendar: SubscriptionChargeCalendar;
  /** Pre-built month labels, so the component stays free of locale logic. */
  monthLabels: string[];
  formatAmount: (amount: number) => string;
  renderVendor?: (row: SubscriptionChargeCalendar['rows'][number]) => ReactNode;
}

export function SubscriptionChargeCalendar({
  calendar,
  monthLabels,
  formatAmount,
  renderVendor,
}: SubscriptionChargeCalendarProps) {
  const peaks = monthPeaks(calendar.rows, monthLabels.length);

  return (
    <div className="lumio-charge-calendar">
      <table className="lumio-charge-calendar__table">
        <caption className="lumio-charge-calendar__caption">
          Expected subscription charges by vendor for the next {monthLabels.length} months
        </caption>
        <thead>
          <tr>
            <th scope="col" className="lumio-charge-calendar__vendor">
              Vendor
            </th>
            {monthLabels.map(label => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendar.rows.map(row => (
            <tr key={row.subscriptionId}>
              <th scope="row" className="lumio-charge-calendar__vendor">
                <span className="lumio-charge-calendar__vendor-inner">
                  {renderVendor?.(row)}
                  {row.vendorName}
                </span>
              </th>
              {monthLabels.map((label, index) => {
                const amount = row.amounts[index] ?? 0;
                const intensity = cellIntensity(amount, peaks[index]);
                return (
                  <td
                    key={label}
                    className={amount > 0 ? undefined : 'lumio-charge-calendar__empty'}
                    // Capped at 80% so the amount stays readable on the tint,
                    // and mixed with the card background rather than with
                    // transparency, which would show the content photo through.
                    style={
                      intensity > 0
                        ? {
                            background: `color-mix(in srgb, var(--ff-dash-primary) ${Math.round(
                              intensity * 80,
                            )}%, var(--card-bg))`,
                          }
                        : undefined
                    }
                  >
                    {amount > 0 ? (
                      formatAmount(amount)
                    ) : (
                      <>
                        {/* A bare aria-label on a span is ignored, so the
                            dash is hidden and the words are read instead. */}
                        <span aria-hidden="true">—</span>
                        <span className="lumio-charge-calendar__sr-only">No charge</span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="lumio-charge-calendar__vendor">
              Total
            </th>
            {monthLabels.map((label, index) => (
              <td key={label}>{formatAmount(calendar.monthTotals[index] ?? 0)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
