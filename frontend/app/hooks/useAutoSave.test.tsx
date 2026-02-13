// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

type Payload = {
  value: string;
};

function Harness({
  data,
  enabled,
  onSave,
}: {
  data: Payload;
  enabled: boolean;
  onSave: (payload: Payload) => Promise<void>;
}) {
  useAutoSave({
    data,
    enabled,
    onSave,
    debounceMs: 500,
  });

  return null;
}

describe('useAutoSave', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('does not save on initial render', async () => {
    const onSave = vi.fn(async () => undefined);

    await act(async () => {
      root.render(<Harness data={{ value: 'initial' }} enabled={true} onSave={onSave} />);
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves after debounce when data changes', async () => {
    const onSave = vi.fn(async () => undefined);

    await act(async () => {
      root.render(<Harness data={{ value: 'initial' }} enabled={true} onSave={onSave} />);
    });

    await act(async () => {
      root.render(<Harness data={{ value: 'updated' }} enabled={true} onSave={onSave} />);
    });

    await act(async () => {
      vi.advanceTimersByTime(499);
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: 'updated' });
  });

  it('cancels pending save on unmount', async () => {
    const onSave = vi.fn(async () => undefined);

    await act(async () => {
      root.render(<Harness data={{ value: 'initial' }} enabled={true} onSave={onSave} />);
    });

    await act(async () => {
      root.render(<Harness data={{ value: 'updated' }} enabled={true} onSave={onSave} />);
    });

    await act(async () => {
      root.unmount();
      vi.advanceTimersByTime(500);
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
