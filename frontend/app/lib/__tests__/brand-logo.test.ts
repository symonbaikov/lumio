import { describe, expect, it } from 'vitest';

import { extractDomainFromSender, getClearbitLogoUrl, getReceiptLogoUrl } from '../brand-logo';

describe('extractDomainFromSender', () => {
  it('extracts domain from standard email', () => {
    expect(extractDomainFromSender('Brand <noreply@brand.com>')).toBe('brand.com');
  });

  it('returns null for generic gmail domain', () => {
    expect(extractDomainFromSender('Sender <support@gmail.com>')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(extractDomainFromSender('No email here')).toBeNull();
  });
});

describe('getClearbitLogoUrl', () => {
  it('builds a Clearbit logo URL from a domain', () => {
    expect(getClearbitLogoUrl('kaspi.kz')).toBe('https://logo.clearbit.com/kaspi.kz');
  });
});

describe('getReceiptLogoUrl', () => {
  it('returns the Clearbit logo URL for a sender domain', () => {
    expect(getReceiptLogoUrl('Kaspi <noreply@kaspi.kz>')).toBe(
      'https://logo.clearbit.com/kaspi.kz',
    );
  });

  it('returns null for a generic sender domain', () => {
    expect(getReceiptLogoUrl('User <test@gmail.com>')).toBeNull();
  });
});
