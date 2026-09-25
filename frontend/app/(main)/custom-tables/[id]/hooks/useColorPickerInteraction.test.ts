import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROW_FILL_SAVE_DELAY_MS, useColorPickerInteraction } from './useColorPickerInteraction';

const rows = [{ id: 'row-1', rowNumber: 1, data: {}, styles: { manualFill: '#ff0000' } }];

describe('useColorPickerInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists the picked colour for the open row after a pause', () => {
    const onUpdateRowStyle = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useColorPickerInteraction({
        rows,
        colorPickerRowId: 'row-1',
        setColorPickerRowId: vi.fn(),
        onUpdateRowStyle,
      }),
    );

    act(() => {
      result.current.handleColorPickerChange('#00ff00');
      result.current.handleColorPickerChange('#0000ff');
    });
    expect(onUpdateRowStyle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(ROW_FILL_SAVE_DELAY_MS);
    });
    expect(onUpdateRowStyle).toHaveBeenCalledTimes(1);
    expect(onUpdateRowStyle).toHaveBeenCalledWith({
      rowId: 'row-1',
      styles: { manualFill: 'rgba(0, 0, 255, 0.15)' },
    });
    expect(result.current.colorPickerValue).toBe('#0000ff');
  });

  it('does nothing when no row is open', () => {
    const onUpdateRowStyle = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useColorPickerInteraction({
        rows,
        colorPickerRowId: null,
        setColorPickerRowId: vi.fn(),
        onUpdateRowStyle,
      }),
    );

    act(() => {
      result.current.handleColorPickerChange('#00ff00');
      vi.advanceTimersByTime(ROW_FILL_SAVE_DELAY_MS);
    });
    expect(onUpdateRowStyle).not.toHaveBeenCalled();
  });

  it('seeds the picker with the current row fill', () => {
    const setColorPickerRowId = vi.fn();
    const { result } = renderHook(() =>
      useColorPickerInteraction({
        rows,
        colorPickerRowId: null,
        setColorPickerRowId,
        onUpdateRowStyle: vi.fn(),
      }),
    );

    act(() => {
      result.current.openColorPickerForRow('row-1', { clientX: 10, clientY: 20 });
    });
    expect(result.current.colorPickerValue).toBe('#ff0000');
    expect(result.current.colorPickerAnchorPosition).toEqual({ top: 20, left: 10 });
    expect(setColorPickerRowId).toHaveBeenCalledWith('row-1');
  });
});
