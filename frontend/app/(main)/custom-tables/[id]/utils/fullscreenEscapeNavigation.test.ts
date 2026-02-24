import { describe, expect, it, vi } from 'vitest';
import { handleFullscreenEscapeNavigation } from './fullscreenEscapeNavigation';

describe('handleFullscreenEscapeNavigation', () => {
  it('calls back navigation on Escape', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation('Escape', onBack);

    expect(handled).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', () => {
    const onBack = vi.fn();

    const handled = handleFullscreenEscapeNavigation('Enter', onBack);

    expect(handled).toBe(false);
    expect(onBack).not.toHaveBeenCalled();
  });
});
