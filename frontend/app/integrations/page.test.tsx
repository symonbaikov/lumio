// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
  },
}));

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt ?? 'image'} />,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const integrationsTexts = vi.hoisted(() => ({
  title: 'Integrations',
  subtitle: 'Connect external services',
  sections: {
    connected: 'Connected',
    available: 'Available',
  },
  empty: {
    connected: 'No connected integrations',
    available: 'No available integrations',
  },
  categories: {
    storage: 'Storage',
    email: 'Email',
    spreadsheets: 'Spreadsheets',
    messaging: 'Messaging',
  },
  cards: {
    dropbox: {
      description: 'Dropbox integration',
      badge: 'Available',
      actions: { connect: 'Connect', docs: 'Docs' },
    },
    googleDrive: {
      description: 'Google Drive integration',
      badge: 'Available',
      actions: { connect: 'Connect', docs: 'Docs' },
    },
    googleSheets: {
      description: 'Google Sheets integration',
      badge: 'Available',
      actions: { connect: 'Connect', docs: 'Docs' },
    },
    telegram: {
      description: 'Telegram integration',
      badge: 'Available',
      actions: { setup: 'Setup', guide: 'Guide' },
    },
  },
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => integrationsTexts,
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('IntegrationsPage', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    push.mockClear();
    apiGet.mockReset();
  });

  it('opens integration when card is clicked', async () => {
    apiGet.mockResolvedValue({ data: { connected: false } });

    const { default: IntegrationsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<IntegrationsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const gmailCard = container.querySelector('[data-integration-card="gmail"]') as HTMLElement;
    expect(gmailCard).toBeTruthy();

    await act(async () => {
      gmailCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(push).toHaveBeenCalledWith('/integrations/gmail');
  });

  it('disables connect action when integration is already connected', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/integrations/gmail/status')) {
        return Promise.resolve({ data: { connected: true } });
      }
      return Promise.resolve({ data: { connected: false } });
    });

    const { default: IntegrationsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<IntegrationsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const connectButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Connect'),
    ) as HTMLButtonElement | undefined;

    expect(connectButton).toBeTruthy();
    expect(connectButton?.disabled).toBe(true);
  });
});
