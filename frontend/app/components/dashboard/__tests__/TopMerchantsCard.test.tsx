// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { TopMerchantsCard } from '../TopMerchantsCard';

const mockMerchants = [
  { name: 'Kaspi Bank', amount: 150000, count: 12 },
  { name: 'Halyk Bank', amount: 80000, count: 5 },
  { name: 'BCC', amount: 30000, count: 3 },
];

describe('TopMerchantsCard', () => {
  it('renders merchant names and formatted amounts', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TopMerchantsCard
          merchants={mockMerchants}
          title="Top Merchants"
          emptyLabel="No data"
          formatAmount={v => `${v} KZT`}
        />,
      );
    });

    expect(container.textContent).toContain('Top Merchants');
    expect(container.textContent).toContain('Kaspi Bank');
    expect(container.textContent).toContain('150000 KZT');
    expect(container.textContent).toContain('Halyk Bank');
    expect(container.textContent).toContain('BCC');
  });

  it('renders empty state when no merchants', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TopMerchantsCard
          merchants={[]}
          title="Top Merchants"
          emptyLabel="No merchant data available"
          formatAmount={v => String(v)}
        />,
      );
    });

    expect(container.textContent).toContain('No merchant data available');
    expect(container.querySelector('a')).toBeNull();
  });

  it('does not render links for merchant rows', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TopMerchantsCard
          merchants={[{ name: 'Kaspi Bank', amount: 150000, count: 12 }]}
          title="Top Merchants"
          emptyLabel="No data"
          formatAmount={v => String(v)}
        />,
      );
    });

    const link = container.querySelector('a');
    expect(link).toBeNull();
  });
});
