// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatementsPage from './page';

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  query: 'openExpenseDrawer=scan',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => new URLSearchParams(navigationMocks.query),
}));

describe('StatementsPage', () => {
  beforeEach(() => {
    navigationMocks.replace.mockReset();
    navigationMocks.query = 'openExpenseDrawer=scan';
  });

  it('preserves query params while redirecting to submit', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(<StatementsPage />);
    });

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      '/statements/submit?openExpenseDrawer=scan',
    );

    act(() => {
      root.unmount();
    });
  });

  it('maps legacy upload param to the scan drawer query', () => {
    navigationMocks.query = 'upload=1';
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(<StatementsPage />);
    });

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      '/statements/submit?openExpenseDrawer=scan',
    );

    act(() => {
      root.unmount();
    });
  });
});
