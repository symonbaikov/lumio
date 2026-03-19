// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import StatementsPage from './page';

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => new URLSearchParams('openExpenseDrawer=scan'),
}));

describe('StatementsPage', () => {
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
});
