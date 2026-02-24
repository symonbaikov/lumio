import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFThumbnail } from './PDFThumbnail';

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

vi.mock('@/app/lib/workspace-headers', () => ({
  getWorkspaceHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

describe('PDFThumbnail', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
    container = null as unknown as HTMLDivElement;
  });

  it('shows file placeholder icon when thumbnail request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const root = createRoot(container);

    await act(async () => {
      root.render(<PDFThumbnail fileId="statement-1" size={36} className="text-red-500" />);
      await Promise.resolve();
    });

    const fallbackIcon = container.querySelector(
      '[data-testid="pdf-thumbnail-fallback-icon"]',
    ) as SVGElement | null;

    expect(fallbackIcon).toBeTruthy();
    expect(fallbackIcon?.getAttribute('width')).toBe('29');
    expect(fallbackIcon?.getAttribute('height')).toBe('29');
    expect(fallbackIcon?.className.baseVal).toContain('text-gray-400');
    expect(fallbackIcon?.className.baseVal).not.toContain('text-red-500');
  });

  it('shows error icon and message in preview mode when thumbnail fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PDFThumbnail
          fileId="statement-2"
          width={320}
          height={460}
          errorMessage="Unable to load document"
        />,
      );
      await Promise.resolve();
    });

    const errorIcon = container.querySelector('[data-testid="pdf-thumbnail-error-icon"]');
    expect(errorIcon).toBeTruthy();
    expect(container.textContent).toContain('Unable to load document');
  });
});
