import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';

describe('StatementsCircularUploadMenu', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null as unknown as HTMLDivElement;
  });

  it('uses larger readable menu actions and labels when opened', () => {
    act(() => {
      root.render(
        <StatementsCircularUploadMenu
          providers={{
            gmailConnected: false,
            googleDriveConnected: false,
            dropboxConnected: false,
          }}
          onScan={vi.fn()}
          onCloudImport={vi.fn()}
          onGmail={vi.fn()}
          onLocalUpload={vi.fn()}
        />,
      );
    });

    const toggleButton = container.querySelector(
      'button[aria-label="Open upload actions"]',
    ) as HTMLButtonElement;
    expect(toggleButton).not.toBeNull();

    const plusIcon = toggleButton.querySelector('svg');
    expect(plusIcon?.getAttribute('width')).toBe('24');
    expect(plusIcon?.getAttribute('height')).toBe('24');

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const actionButtons = Array.from(container.querySelectorAll('button[title]'));
    expect(actionButtons).toHaveLength(4);
    actionButtons.forEach(button => {
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('w-11');
    });

    const labelClassNames = ['Scan', 'Cloud', 'Gmail', 'Create expense'].map(label => {
      const node = Array.from(container.querySelectorAll('span')).find(
        span => span.textContent?.trim() === label && !span.className.includes('sr-only'),
      );
      expect(node).toBeTruthy();
      return node?.className ?? '';
    });

    labelClassNames.forEach(className => {
      expect(className).toContain('text-[11px]');
      expect(className).toContain('px-2.5');
    });

    const blueArc = Array.from(container.querySelectorAll('div')).find(
      div =>
        div.className.includes('pointer-events-none') &&
        div.className.includes('bg-primary') &&
        div.className.includes('rounded-tr-'),
    );
    expect(blueArc).toBeTruthy();
  });

  it('closes when clicking anywhere outside FAB controls', () => {
    act(() => {
      root.render(
        <StatementsCircularUploadMenu
          providers={{
            gmailConnected: false,
            googleDriveConnected: false,
            dropboxConnected: false,
          }}
          onScan={vi.fn()}
          onCloudImport={vi.fn()}
          onGmail={vi.fn()}
          onLocalUpload={vi.fn()}
        />,
      );
    });

    const toggleButton = container.querySelector(
      'button[aria-label="Open upload actions"]',
    ) as HTMLButtonElement;
    expect(toggleButton).not.toBeNull();

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const plusIcon = toggleButton.querySelector('svg');
    expect(plusIcon?.className.baseVal).toContain('rotate-45');

    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    expect(plusIcon?.className.baseVal).toContain('rotate-0');
  });
});
