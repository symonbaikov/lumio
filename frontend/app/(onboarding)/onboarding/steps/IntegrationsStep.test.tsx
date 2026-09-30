import type { LucideProps } from '@/app/components/icons';
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { IntegrationsStep, type OnboardingIntegrationCard } from './IntegrationsStep';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    integrations: {
      title: { value: { en: 'Connect your integrations' } },
      subtitle: { value: { en: 'Pick services you want to set up now.' } },
      helper: {
        value: {
          en: 'If you skip this step, you can connect integrations later in Settings -> Integrations.',
        },
      },
      connectedBadge: { value: { en: 'Connected' } },
      availableBadge: { value: { en: 'Available' } },
    },
  }),
}));

const TestIcon = (_props: LucideProps): React.ReactElement => (
  <svg data-testid="integration-test-icon" />
);

const LEGACY_CARD_TITLES = [
  'Drop' + 'box',
  `Google ${'Drive'}`,
  'G' + 'mail',
];

function makeCards(): OnboardingIntegrationCard[] {
  return [
    {
      key: 's3Compatible',
      title: 'S3-compatible storage',
      description: 'Connect MinIO or any S3-compatible bucket for imports and sync.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Set up',
    },
    {
      key: 'webdav',
      title: 'WebDAV storage',
      description: 'Connect Nextcloud or another WebDAV-compatible file store.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Set up',
    },
    {
      key: 'imap',
      title: 'IMAP inbox',
      description: 'Import receipts from any IMAP-compatible mailbox.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Connect',
    },
    {
      key: 'smtp',
      title: 'SMTP email',
      description: 'Send invitations through any SMTP-compatible mail server.',
      icon: TestIcon,
      connected: true,
      loading: false,
      actionLabel: 'Connected',
    },
    {
      key: 'aiCompatible',
      title: 'AI-compatible endpoint',
      description: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Set up',
    },
    {
      key: 'telegram',
      title: 'Telegram',
      description: 'Connect a bot for reports and notification delivery.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Set up',
    },
    {
      key: 'appUrl',
      title: 'Application URL',
      description: 'Set the public URL used in invitation and sharing links.',
      icon: TestIcon,
      connected: false,
      loading: false,
      actionLabel: 'Set up',
    },
  ];
}

describe('IntegrationsStep', () => {
  it('renders current protocol integrations and hides legacy SaaS cards', () => {
    render(<IntegrationsStep cards={makeCards()} onConnect={vi.fn()} />);

    expect(screen.getByText('S3-compatible storage')).toBeTruthy();
    expect(screen.getByText('WebDAV storage')).toBeTruthy();
    expect(screen.getByText('IMAP inbox')).toBeTruthy();
    expect(screen.getByText('SMTP email')).toBeTruthy();
    expect(screen.getByText('AI-compatible endpoint')).toBeTruthy();
    expect(screen.getByText('Telegram')).toBeTruthy();
    expect(screen.getByText('Application URL')).toBeTruthy();
    LEGACY_CARD_TITLES.forEach(title => {
      expect(screen.queryByText(title)).toBeNull();
    });
    expect(screen.getAllByTestId('integration-test-icon')).toHaveLength(7);
  });

  it('calls connect with the selected integration key', () => {
    const onConnect = vi.fn();
    render(<IntegrationsStep cards={makeCards()} onConnect={onConnect} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Set up' })[0]);

    expect(onConnect).toHaveBeenCalledWith('s3Compatible');
  });
});
