import { describe, expect, it } from 'vitest';

import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';

describe('resolveGmailMerchantLabel', () => {
  it('uses parsed vendor when it is a short brand-like value', () => {
    const label = resolveGmailMerchantLabel({
      vendor: 'GitHub',
      sender: 'GitHub <noreply@github.com>',
      subject: '[GitHub] Receipt',
    });

    expect(label).toBe('GitHub');
  });

  it('prefers sender brand when vendor is long descriptive sentence', () => {
    const label = resolveGmailMerchantLabel({
      vendor: 'We received payment for your sponsorship. Thanks for your support of Open Source Software!',
      sender: 'GitHub <noreply@github.com>',
      subject: '[GitHub] Payment receipt',
    });

    expect(label).toBe('GitHub');
  });

  it('strips support suffix from sender display name', () => {
    const label = resolveGmailMerchantLabel({
      sender: 'Bitwage Support <support@bitwage.com>',
    });

    expect(label).toBe('Bitwage');
  });

  it('extracts brand from sender domain when sender has no display name', () => {
    const label = resolveGmailMerchantLabel({
      sender: '<billing@lidl.com>',
    });

    expect(label).toBe('Lidl');
  });

  it('does not return generic page marker text', () => {
    const label = resolveGmailMerchantLabel({
      vendor: 'Page 1 of 1',
      sender: 'GitHub <noreply@github.com>',
      subject: 'Payment receipt',
    });

    expect(label).toBe('GitHub');
  });
});
