import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BankLogoAvatar } from './BankLogoAvatar';

describe('BankLogoAvatar', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    container = null as unknown as HTMLDivElement;
  });

  it('renders AccountBalance fallback icon for "other" bank', () => {
    const root = createRoot(container);

    act(() => {
      root.render(<BankLogoAvatar bankName="other" size={20} />);
    });

    expect(container.querySelector('[data-testid="bank-logo-fallback-icon"]')).toBeTruthy();
    expect(container.querySelector('img[src="/images/bank-logo/bank.png"]')).toBeNull();
  });
});
