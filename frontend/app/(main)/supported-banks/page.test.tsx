// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const content = vi.hoisted(() => ({
  title: 'Supported banks',
  subtitle: 'Banks currently supported for statement parsing',
  parserStatus: 'Parser is active',
  comingSoon: 'More banks are coming soon',
  banks: {
    kaspi: {
      name: 'Kaspi',
      status: 'Supported',
      formats: 'PDF statements',
      notes: 'Upload Kaspi statement files for automatic parsing.',
    },
    bereke: {
      name: 'Bereke',
      status: 'Supported',
      formats: 'PDF statements',
      notes: 'Upload Bereke statement files for automatic parsing.',
    },
  },
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => content,
}));

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt ?? 'image'} />,
}));

describe('SupportedBanksPage', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders supported bank cards for Kaspi and Bereke', async () => {
    const { default: SupportedBanksPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SupportedBanksPage />);
    });

    expect(container.textContent).toContain('Supported banks');
    expect(container.textContent).toContain('Kaspi');
    expect(container.textContent).toContain('Bereke');
    expect(container.querySelector('[data-supported-bank="kaspi"]')).toBeTruthy();
    expect(container.querySelector('[data-supported-bank="bereke"]')).toBeTruthy();
  });
});
