// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateExpenseDrawer from './CreateExpenseDrawer';

describe('CreateExpenseDrawer mobile uploads', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('uses camera-friendly file input in scan mode', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={async () => undefined}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(uploadInput).toBeTruthy();
    expect(uploadInput?.getAttribute('accept')).toContain('image/*');
    expect(uploadInput?.getAttribute('capture')).toBe('environment');
  });
});
