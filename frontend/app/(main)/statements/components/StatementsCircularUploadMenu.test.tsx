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
    expect(plusIcon).toBeTruthy();

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const actionButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[title]'),
    );
    expect(actionButtons).toHaveLength(4);
    actionButtons.forEach(button => {
      expect(button.style.height).toBe('44px');
      expect(button.style.width).toBe('44px');
    });

    const labelNodes = ['Scan', 'Cloud', 'Mailbox', 'Create expense'].map(label => {
      const node = Array.from(container.querySelectorAll('span')).find(
        span => span.textContent?.trim() === label && span.style.width !== '1px',
      );
      expect(node).toBeTruthy();
      return node;
    });

    labelNodes.forEach(node => {
      expect(node?.style.fontSize).toBe('11px');
      expect(node?.style.padding).toBe('4px 10px');
    });

    const blueArc = Array.from(container.querySelectorAll('div')).find(
      div =>
        div.style.pointerEvents === 'none' &&
        div.style.background.includes('rgba') &&
        div.style.borderTopRightRadius,
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
    expect(plusIcon?.getAttribute('style')).toContain('rotate(45deg)');

    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    expect(plusIcon?.getAttribute('style')).toContain('rotate(0deg)');
  });

  it('shows full-screen dimmed backdrop when menu is open', () => {
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

    const closedBackdrop = document.querySelector('[data-statements-fab-backdrop="true"]');
    expect(closedBackdrop).toBeTruthy();
    expect((closedBackdrop as HTMLElement).style.opacity).toBe('0');
    expect((closedBackdrop as HTMLElement).style.pointerEvents).toBe('none');

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const backdrop = document.querySelector('[data-statements-fab-backdrop="true"]');
    expect(backdrop).toBeTruthy();
    expect((backdrop as HTMLElement).style.background).toBe('rgba(0, 0, 0, 0.45)');
    expect((backdrop as HTMLElement).style.opacity).toBe('1');
  });

  it('runs scan action from dedicated scan button', () => {
    const onScan = vi.fn();

    act(() => {
      root.render(
        <StatementsCircularUploadMenu
          providers={{
            gmailConnected: false,
            googleDriveConnected: false,
            dropboxConnected: false,
          }}
          onScan={onScan}
          onCloudImport={vi.fn()}
          onGmail={vi.fn()}
          onLocalUpload={vi.fn()}
        />,
      );
    });

    const scanButton = container.querySelector('button[aria-label="Scan"]') as HTMLButtonElement;
    expect(scanButton).not.toBeNull();

    act(() => {
      scanButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('uses dark-safe floating action button surfaces instead of white pills', () => {
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

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const whiteAction = Array.from(container.querySelectorAll('button')).find(
      button => button.style.background === 'white' || button.style.background === '#fff',
    );
    const mutedAction = Array.from(container.querySelectorAll('button')).find(button =>
      button.style.background.includes('var(--card-bg'),
    );

    expect(whiteAction).toBeUndefined();
    expect(mutedAction).toBeTruthy();
  });
});
