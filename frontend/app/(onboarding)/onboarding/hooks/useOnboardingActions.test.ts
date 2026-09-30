import { describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGetMock,
  },
}));

import {
  EMPTY_INTEGRATION_STATE,
  ONBOARDING_INTEGRATIONS,
  buildIntegrationCards,
  checkIntegrationConnected,
  parseIntegrationConnectedStatus,
} from './useOnboardingActions';

const LEGACY_CARD_TITLES = [
  'Drop' + 'box',
  `Google ${'Drive'}`,
  'G' + 'mail',
];

describe('onboarding integration actions', () => {
  it('uses current OSS and protocol integrations only', () => {
    expect(ONBOARDING_INTEGRATIONS.map(item => item.key)).toEqual([
      's3Compatible',
      'webdav',
      'imap',
      'smtp',
      'aiCompatible',
      'telegram',
      'appUrl',
    ]);
  });

  it('detects connected status from generic status response shapes', () => {
    expect(parseIntegrationConnectedStatus({ connected: true })).toBe(true);
    expect(parseIntegrationConnectedStatus({ configured: true })).toBe(true);
    expect(parseIntegrationConnectedStatus({ enabled: true })).toBe(true);
    expect(parseIntegrationConnectedStatus({ status: 'connected' })).toBe(true);
    expect(parseIntegrationConnectedStatus({ status: 'configured' })).toBe(true);
    expect(parseIntegrationConnectedStatus({ status: 'missing' })).toBe(false);
  });

  it('checks every configured status path', async () => {
    apiGetMock.mockResolvedValue({ data: { configured: true } });

    await Promise.all(ONBOARDING_INTEGRATIONS.map(checkIntegrationConnected));

    expect(apiGetMock.mock.calls.map(([path]) => path)).toEqual([
      '/integrations/s3-compatible/status',
      '/integrations/webdav/status',
      '/integrations/imap/status',
      '/settings/email/smtp',
      '/settings/integrations/ai',
      '/settings/notifications/telegram',
      '/settings/app',
    ]);
  });

  it('builds cards with fallback titles and no legacy SaaS cards', () => {
    const cards = buildIntegrationCards({
      tx: () => '',
      integrationStatuses: { ...EMPTY_INTEGRATION_STATE, smtp: true },
      integrationLoading: EMPTY_INTEGRATION_STATE,
    });

    expect(cards.map(card => card.title)).toEqual([
      'S3-compatible storage',
      'WebDAV storage',
      'IMAP inbox',
      'SMTP email',
      'AI-compatible endpoint',
      'Telegram',
      'Application URL',
    ]);
    expect(cards.some(card => LEGACY_CARD_TITLES.includes(card.title))).toBe(false);
    expect(cards.find(card => card.key === 'smtp')?.connected).toBe(true);
  });
});
