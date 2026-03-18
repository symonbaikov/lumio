// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
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
    document.body.innerHTML = '';
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

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps auto-categorization enabled for scan uploads', async () => {
    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSubmitScan = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={onSubmitScan}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const file = new File(['dummy'], 'statement.pdf', { type: 'application/pdf' });
    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(uploadInput, { target: { files: [file] } });
    });

    const submitButton = screen.getByRole('button', { name: /upload receipt/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(onSubmitScan).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [file],
        requireManualCategorySelection: false,
      }),
    );

    await act(async () => {
      root.unmount();
    });
  });
});
