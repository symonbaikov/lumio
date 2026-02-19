// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePullToRefresh } from './usePullToRefresh';

let latestHook: {
  handlers: {
    onTouchStart: (event: any) => void;
    onTouchMove: (event: any) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
  isReadyToRefresh: boolean;
  isRefreshing: boolean;
  pullDistance: number;
} | null = null;

function HookProbe({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  latestHook = usePullToRefresh({
    enabled: true,
    threshold: 40,
    maxPull: 100,
    resistance: 1,
    isAtTop: () => true,
    onRefresh,
  });

  return <div data-testid="pull-probe" />;
}

const createTouchEvent = (y: number) => ({
  touches: [{ clientX: 0, clientY: y }],
  preventDefault: () => undefined,
});

describe('usePullToRefresh', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('triggers refresh after crossing threshold', async () => {
    const onRefresh = vi.fn(async () => undefined);
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<HookProbe onRefresh={onRefresh} />);
    });

    expect(latestHook).toBeTruthy();

    await act(async () => {
      latestHook?.handlers.onTouchStart(createTouchEvent(0));
      latestHook?.handlers.onTouchMove(createTouchEvent(60));
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      latestHook?.handlers.onTouchEnd();
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
