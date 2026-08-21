import AE from 'country-flag-icons/react/3x2/AE';
import DE from 'country-flag-icons/react/3x2/DE';
import GB from 'country-flag-icons/react/3x2/GB';
import KZ from 'country-flag-icons/react/3x2/KZ';
import PL from 'country-flag-icons/react/3x2/PL';
import US from 'country-flag-icons/react/3x2/US';
import type React from 'react';

/**
 * The shape country-flag-icons exports. Mirrored rather than imported because
 * the package declares it locally and does not export the type.
 */
export type FlagComponent = (
  props: React.HTMLAttributes<HTMLElement & SVGElement>,
) => React.JSX.Element;

export interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  taxName: string;
  currency: string;
  scheme: string;
  registrationThreshold: string | number | null;
}

export interface JurisdictionRate {
  code: string;
  name: string;
  rate: string | number;
  kind: string;
  isDefault: boolean;
  validFrom: string;
  validTo: string | null;
}

/**
 * Flags are imported per country rather than as a namespace: the namespace
 * pulls in around 250 SVG components, and we support six.
 *
 * A jurisdiction seeded on the server without a matching entry here renders
 * without a flag rather than breaking, so the backend can add a country
 * without waiting on a frontend release.
 */
const FLAGS: Record<string, FlagComponent> = { KZ, DE, PL, GB, AE, US };

export function flagFor(code: string): FlagComponent | null {
  return FLAGS[code.toUpperCase()] ?? null;
}

/** '12.00' -> '12%', '5.50' -> '5.5%'. Trailing zeros read as false precision. */
export function formatRate(rate: string | number): string {
  const value = Number(rate);
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${Number(value.toFixed(2))}%`;
}

/**
 * Rates in force on a date, newest-starting first.
 *
 * The catalogue holds every version of every rate, so the settings screen has
 * to narrow to the ones that actually apply — otherwise a workspace picking
 * Kazakhstan today would be shown both the retired 12% and the current 16%.
 */
export function ratesInForce(rates: JurisdictionRate[], on: string): JurisdictionRate[] {
  return rates
    .filter(rate => rate.validFrom <= on && (rate.validTo === null || rate.validTo >= on))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return Number(b.rate) - Number(a.rate);
    });
}

/** Local calendar day as 'YYYY-MM-DD', which is what the API compares against. */
export function todayLocal(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Only rendered when an address is configured. Inventing a support address
 * would produce a link that silently goes nowhere.
 */
export function supportMailto(subject: string): string | null {
  const address = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!address) {
    return null;
  }
  return `mailto:${address}?subject=${encodeURIComponent(subject)}`;
}
