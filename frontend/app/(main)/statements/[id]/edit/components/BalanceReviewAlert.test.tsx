// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BalanceReviewAlert } from './BalanceReviewAlert';

const post = vi.fn();
vi.mock('@/app/lib/api', () => ({ default: { post: (...args: unknown[]) => post(...args) } }));

const labels = {
  title: 'Balance does not reconcile',
  description: 'This statement stays out of analytics until you confirm the discrepancy.',
  expected: 'Expected',
  actual: 'Reported',
  difference: 'Difference',
  confirm: 'Confirm discrepancy',
  confirmFailed: 'Failed to confirm the discrepancy',
};

const parsingDetails = {
  validation: {
    passed: false,
    balanceCheck: { expectedEnd: 1100, actualEnd: 1500, difference: 400, tolerance: 0.01 },
  },
};

describe('BalanceReviewAlert', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    post.mockReset();
    post.mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (props: Partial<React.ComponentProps<typeof BalanceReviewAlert>> = {}) =>
    act(async () => {
      root.render(
        <BalanceReviewAlert
          statementId="stmt-1"
          status="needs_review"
          parsingDetails={parsingDetails}
          labels={labels}
          formatNumber={n => String(n ?? '—')}
          onConfirmed={vi.fn()}
          {...props}
        />,
      );
    });

  const clickConfirm = () =>
    act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="confirm-balance-button"]')?.click();
    });

  it('shows the discrepancy figures so the user can judge before confirming', async () => {
    await render();

    expect(container.textContent).toContain('Balance does not reconcile');
    expect(container.textContent).toContain('1100');
    expect(container.textContent).toContain('1500');
    expect(container.textContent).toContain('400');
  });

  it('renders nothing for a statement that is not awaiting review', async () => {
    await render({ status: 'completed' });

    expect(container.textContent).toBe('');
  });

  it('confirms via the API and tells the page to refresh', async () => {
    const onConfirmed = vi.fn();
    await render({ onConfirmed });
    await clickConfirm();

    expect(post).toHaveBeenCalledWith('/statements/stmt-1/confirm-balance');
    expect(onConfirmed).toHaveBeenCalled();
  });

  it('surfaces a failure and does not refresh the page', async () => {
    const onConfirmed = vi.fn();
    post.mockRejectedValueOnce(new Error('403'));
    await render({ onConfirmed });
    await clickConfirm();

    expect(container.textContent).toContain('Failed to confirm the discrepancy');
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('still renders when the backend reported no balance figures', async () => {
    await render({ parsingDetails: { validation: { passed: false } } });

    expect(container.textContent).toContain('Balance does not reconcile');
    expect(container.querySelector('[data-testid="confirm-balance-button"]')).not.toBeNull();
  });
});
