// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ActionRequired } from '../ActionRequired';

describe('ActionRequired', () => {
  it('renders action items with links', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    const actions = [
      {
        type: 'statements_pending_submit',
        count: 3,
        label: '3 statements pending submit',
        href: '/statements/submit',
      },
      {
        type: 'payments_overdue',
        count: 2,
        label: '2 payments overdue',
        href: '/statements/pay',
      },
    ];

    await act(async () => {
      root.render(
        <ActionRequired actions={actions} title="Action Required" emptyLabel="All clear" />,
      );
    });

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/statements/submit');
    expect(links[1].getAttribute('href')).toBe('/statements/pay');
    expect(container.textContent).toContain('Action Required');
    expect(container.textContent).toContain('3 statements pending submit');
    expect(container.textContent).toContain('2 payments overdue');
  });

  it('renders empty state when there are no actions', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ActionRequired actions={[]} title="Action Required" emptyLabel="All clear" />,
      );
    });

    expect(container.textContent).toContain('All clear');
  });
});
