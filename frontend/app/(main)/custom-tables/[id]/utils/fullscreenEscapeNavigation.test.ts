import { describe, expect, it, vi } from 'vitest';
import { handleFullscreenEscapeNavigation } from './fullscreenEscapeNavigation';

const noOverlay = () => false;

describe('handleFullscreenEscapeNavigation', () => {
  it('calls back navigation on Escape', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation(
      { key: 'Escape', defaultPrevented: false },
      onBack,
      noOverlay,
    );

    expect(handled).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation(
      { key: 'Enter', defaultPrevented: false },
      onBack,
      noOverlay,
    );

    expect(handled).toBe(false);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('stays on the page while an overlay is open', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation(
      { key: 'Escape', defaultPrevented: false },
      onBack,
      () => true,
    );

    expect(handled).toBe(false);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('respects a handler that already consumed the key', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation(
      { key: 'Escape', defaultPrevented: true },
      onBack,
      noOverlay,
    );

    expect(handled).toBe(false);
    expect(onBack).not.toHaveBeenCalled();
  });
});
