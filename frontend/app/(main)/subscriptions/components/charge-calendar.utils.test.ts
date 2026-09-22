import { describe, expect, it } from 'vitest';
import { cellIntensity, monthPeaks } from './charge-calendar.utils';

describe('cellIntensity', () => {
  it('is zero for an empty cell', () => {
    expect(cellIntensity(0, 100)).toBe(0);
  });

  it('is one when the cell is the biggest charge that month', () => {
    expect(cellIntensity(100, 100)).toBe(1);
  });

  it('scales in between', () => {
    expect(cellIntensity(25, 100)).toBe(0.25);
  });

  it('stays zero rather than NaN when the month is empty', () => {
    expect(cellIntensity(0, 0)).toBe(0);
    expect(cellIntensity(10, 0)).toBe(0);
  });
});

describe('monthPeaks', () => {
  it('takes the largest charge of each month', () => {
    const rows = [{ amounts: [10, 500] }, { amounts: [90, 5] }];
    expect(monthPeaks(rows, 2)).toEqual([90, 500]);
  });

  it('reports zero for a month nobody charges in', () => {
    expect(monthPeaks([{ amounts: [0, 0] }], 2)).toEqual([0, 0]);
  });

  it('tolerates rows shorter than the horizon', () => {
    expect(monthPeaks([{ amounts: [5] }], 3)).toEqual([5, 0, 0]);
  });
});
