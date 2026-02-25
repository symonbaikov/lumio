// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const paginationPropsSpy = vi.fn<(props: Record<string, unknown>) => void>();

vi.mock('@heroui/react', async () => {
  const reactModule = await import('react');

  return {
    Pagination: (props: Record<string, unknown>) => {
      paginationPropsSpy(props);
      return reactModule.createElement('div', { 'data-testid': 'hero-pagination' });
    },
  };
});

import { AppPagination } from './pagination';

describe('AppPagination', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    paginationPropsSpy.mockClear();
  });

  it('always enables HeroUI controls and loop mode', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<AppPagination page={2} total={10} onChange={() => undefined} />);
    });

    expect(paginationPropsSpy).toHaveBeenCalled();

    const [props] = paginationPropsSpy.mock.calls.at(-1) ?? [];
    expect(props?.showControls).toBe(true);
    expect(props?.loop).toBe(true);
    expect(props?.isCompact).toBeUndefined();
    expect(props?.variant).toBeUndefined();
    expect(props?.radius).toBeUndefined();
    expect(props?.classNames).toBeUndefined();
  });
});
