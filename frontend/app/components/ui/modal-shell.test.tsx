import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModalShell } from './modal-shell';

describe('ModalShell', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const fabPortal = document.createElement('div');
    fabPortal.id = 'fab-portal';
    fabPortal.className = 'fixed inset-0 z-[300] pointer-events-none';
    document.body.appendChild(fabPortal);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.getElementById('fab-portal')?.remove();
    container.remove();
  });

  it('renders above the floating action portal', async () => {
    await act(async () => {
      root.render(
        <ModalShell isOpen onClose={() => undefined} showCloseButton={false}>
          <div>Modal content</div>
        </ModalShell>,
      );
      await Promise.resolve();
    });

    const dialog = document.body.querySelector('[role="dialog"]') as HTMLDivElement | null;
    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('z-[400]');
  });
});
