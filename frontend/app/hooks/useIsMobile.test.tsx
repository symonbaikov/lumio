// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBreakpoint, useIsMobile, useIsTablet } from './useIsMobile';

type ChangeListener = (event: MediaQueryListEvent) => void;

let viewportWidth = 375;
const queryListeners = new Map<string, Set<ChangeListener>>();

const evaluateQuery = (query: string, width: number) => {
  const minMatch = query.match(/min-width:\s*(\d+)px/);
  const maxMatch = query.match(/max-width:\s*(\d+)px/);
  const min = minMatch ? Number(minMatch[1]) : Number.NEGATIVE_INFINITY;
  const max = maxMatch ? Number(maxMatch[1]) : Number.POSITIVE_INFINITY;
  return width >= min && width <= max;
};

const notifyMediaQueries = () => {
  queryListeners.forEach((listeners, query) => {
    const event = {
      matches: evaluateQuery(query, viewportWidth),
      media: query,
    } as MediaQueryListEvent;
    listeners.forEach(listener => listener(event));
  });
};

const setViewportWidth = (width: number) => {
  viewportWidth = width;
  notifyMediaQueries();
};

function HookProbe() {
  const breakpoint = useBreakpoint();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div
      data-testid="breakpoint"
      data-breakpoint={breakpoint}
      data-mobile={String(isMobile)}
      data-tablet={String(isTablet)}
    />
  );
}

describe('useIsMobile', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    viewportWidth = 375;
    queryListeners.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string): MediaQueryList => {
        const listeners = queryListeners.get(query) ?? new Set<ChangeListener>();
        queryListeners.set(query, listeners);

        const mql: MediaQueryList = {
          get matches() {
            return evaluateQuery(query, viewportWidth);
          },
          media: query,
          onchange: null,
          addEventListener: (_type: 'change', listener: EventListenerOrEventListenerObject) => {
            if (typeof listener === 'function') {
              listeners.add(listener as ChangeListener);
            }
          },
          removeEventListener: (_type: 'change', listener: EventListenerOrEventListenerObject) => {
            if (typeof listener === 'function') {
              listeners.delete(listener as ChangeListener);
            }
          },
          addListener: listener => {
            if (listener) {
              listeners.add(listener);
            }
          },
          removeListener: listener => {
            if (listener) {
              listeners.delete(listener);
            }
          },
          dispatchEvent: () => true,
        };

        return mql;
      },
    });
  });

  afterEach(() => {
    queryListeners.clear();
  });

  it('returns mobile/tablet/desktop states based on viewport width', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<HookProbe />);
    });

    const probe = container.querySelector('[data-testid="breakpoint"]') as HTMLDivElement;
    expect(probe.dataset.breakpoint).toBe('mobile');
    expect(probe.dataset.mobile).toBe('true');
    expect(probe.dataset.tablet).toBe('false');

    await act(async () => {
      setViewportWidth(900);
    });

    expect(probe.dataset.breakpoint).toBe('tablet');
    expect(probe.dataset.mobile).toBe('false');
    expect(probe.dataset.tablet).toBe('true');

    await act(async () => {
      setViewportWidth(1280);
    });

    expect(probe.dataset.breakpoint).toBe('desktop');
    expect(probe.dataset.mobile).toBe('false');
    expect(probe.dataset.tablet).toBe('false');
  });
});
