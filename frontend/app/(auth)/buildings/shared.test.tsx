import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WindowGrid, stableWindowNoise } from './shared';

describe('auth building shared visuals', () => {
  it('uses deterministic integer noise for the window pattern', () => {
    expect(stableWindowNoise(1)).toBe(0.40834908187389374);
    expect(stableWindowNoise(40)).toBe(0.9801436183042824);
    expect(stableWindowNoise(80)).toBe(0.17643851414322853);
  });

  it('keeps the server-rendered window cells static for hydration', () => {
    const html = renderToString(<WindowGrid cols={3} rows={2} density={0.5} />);

    expect(html).not.toContain('background:white');
    expect(html).not.toContain('background:transparent');
    expect(html).toContain('rgba(255, 255, 255, 0.28)');
  });

  it('renders stable window cells without per-cell hydration-sensitive styles', () => {
    const { container } = render(<WindowGrid cols={3} rows={2} density={0.5} />);
    const grid = container.firstElementChild;

    expect(
      Array.from(grid?.children ?? []).map(cell => (cell as HTMLElement).style.background),
    ).toEqual([
      'rgba(255, 255, 255, 0.28)',
      'rgba(255, 255, 255, 0.28)',
      'rgba(255, 255, 255, 0.28)',
      'rgba(255, 255, 255, 0.28)',
      'rgba(255, 255, 255, 0.28)',
      'rgba(255, 255, 255, 0.28)',
    ]);
  });
});
