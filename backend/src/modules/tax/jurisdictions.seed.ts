import { TaxRateKind } from '../../entities/tax-jurisdiction-rate.entity';
import {
  TaxFilingPeriod,
  TaxScheme,
  TaxThresholdPeriod,
} from '../../entities/tax-jurisdiction.entity';

/**
 * Statutory reference data for the jurisdictions we support.
 *
 * ⚠ These figures encode tax law and MUST be reviewed by an accountant before
 * this feature is enabled in production. They are seeded by migration rather
 * than edited at runtime, so correcting one means shipping a migration. Only
 * jurisdictions with actual users belong here — do not pre-populate countries
 * nobody has asked for.
 *
 * `validFrom: '1900-01-01'` is a sentinel meaning "since before we care", which
 * keeps every point-in-time query a plain BETWEEN with no NULL special case.
 */

export interface SeedRate {
  code: string;
  name: string;
  rate: number;
  kind: TaxRateKind;
  isDefault: boolean;
  validFrom: string;
  validTo: string | null;
}

export interface SeedJurisdiction {
  code: string;
  name: string;
  taxName: string;
  currency: string;
  scheme: TaxScheme;
  isEu: boolean;
  filingPeriod: TaxFilingPeriod;
  registrationThreshold: number | null;
  thresholdPeriod: TaxThresholdPeriod | null;
  rates: SeedRate[];
}

const SINCE_ALWAYS = '1900-01-01';

export const JURISDICTION_SEED: SeedJurisdiction[] = [
  {
    code: 'KZ',
    name: 'Kazakhstan',
    taxName: 'НДС',
    currency: 'KZT',
    scheme: TaxScheme.VAT,
    isEu: false,
    filingPeriod: TaxFilingPeriod.QUARTERLY,
    // Denominated in MRP and re-set every year, so we do not track a number.
    registrationThreshold: null,
    thresholdPeriod: null,
    rates: [
      {
        code: 'KZ_STANDARD',
        name: 'НДС 12%',
        rate: 12,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: SINCE_ALWAYS,
        validTo: '2025-12-31',
      },
      {
        code: 'KZ_STANDARD',
        name: 'НДС 16%',
        rate: 16,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: '2026-01-01',
        validTo: null,
      },
      {
        code: 'KZ_ZERO',
        name: 'НДС 0% (экспорт)',
        rate: 0,
        kind: TaxRateKind.ZERO,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'KZ_EXEMPT',
        name: 'Без НДС',
        rate: 0,
        kind: TaxRateKind.EXEMPT,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    taxName: 'USt',
    currency: 'EUR',
    scheme: TaxScheme.VAT,
    isEu: true,
    filingPeriod: TaxFilingPeriod.QUARTERLY,
    registrationThreshold: 25000,
    thresholdPeriod: TaxThresholdPeriod.CALENDAR_YEAR,
    rates: [
      {
        code: 'DE_STANDARD',
        name: 'USt 19%',
        rate: 19,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'DE_REDUCED',
        name: 'USt 7%',
        rate: 7,
        kind: TaxRateKind.REDUCED,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'DE_ZERO',
        name: 'USt 0%',
        rate: 0,
        kind: TaxRateKind.ZERO,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
    ],
  },
  {
    code: 'PL',
    name: 'Poland',
    taxName: 'VAT',
    currency: 'PLN',
    scheme: TaxScheme.VAT,
    isEu: true,
    filingPeriod: TaxFilingPeriod.MONTHLY,
    registrationThreshold: 200000,
    thresholdPeriod: TaxThresholdPeriod.CALENDAR_YEAR,
    rates: [
      {
        code: 'PL_STANDARD',
        name: 'VAT 23%',
        rate: 23,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'PL_REDUCED_8',
        name: 'VAT 8%',
        rate: 8,
        kind: TaxRateKind.REDUCED,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'PL_REDUCED_5',
        name: 'VAT 5%',
        rate: 5,
        kind: TaxRateKind.REDUCED,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'PL_ZERO',
        name: 'VAT 0%',
        rate: 0,
        kind: TaxRateKind.ZERO,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    taxName: 'VAT',
    currency: 'GBP',
    scheme: TaxScheme.VAT,
    isEu: false,
    filingPeriod: TaxFilingPeriod.QUARTERLY,
    registrationThreshold: 90000,
    thresholdPeriod: TaxThresholdPeriod.ROLLING_12M,
    rates: [
      {
        code: 'GB_STANDARD',
        name: 'VAT 20%',
        rate: 20,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'GB_REDUCED',
        name: 'VAT 5%',
        rate: 5,
        kind: TaxRateKind.REDUCED,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'GB_ZERO',
        name: 'VAT 0%',
        rate: 0,
        kind: TaxRateKind.ZERO,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    taxName: 'VAT',
    currency: 'AED',
    scheme: TaxScheme.VAT,
    isEu: false,
    filingPeriod: TaxFilingPeriod.QUARTERLY,
    registrationThreshold: 375000,
    thresholdPeriod: TaxThresholdPeriod.ROLLING_12M,
    rates: [
      {
        code: 'AE_STANDARD',
        name: 'VAT 5%',
        rate: 5,
        kind: TaxRateKind.STANDARD,
        isDefault: true,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
      {
        code: 'AE_ZERO',
        name: 'VAT 0%',
        rate: 0,
        kind: TaxRateKind.ZERO,
        isDefault: false,
        validFrom: SINCE_ALWAYS,
        validTo: null,
      },
    ],
  },
  {
    // Seeded so the country is selectable, but intentionally rate-less: US
    // sales tax depends on the buyer's state and county and grants no input
    // credit, so it does not fit the VAT model this engine implements.
    code: 'US',
    name: 'United States',
    taxName: 'Sales tax',
    currency: 'USD',
    scheme: TaxScheme.SALES_TAX,
    isEu: false,
    filingPeriod: TaxFilingPeriod.QUARTERLY,
    registrationThreshold: null,
    thresholdPeriod: null,
    rates: [],
  },
];
