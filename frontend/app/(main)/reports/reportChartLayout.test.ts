import { describe, expect, it } from 'vitest';
import { buildResponsiveReportChartLayout } from './reportChartLayout';

describe('buildResponsiveReportChartLayout', () => {
  it('returns compact mobile chart settings', () => {
    const layout = buildResponsiveReportChartLayout(true);

    expect(layout.primaryChartHeight).toBe(280);
    expect(layout.secondaryChartHeight).toBe(260);
    expect(layout.pieRadius).toEqual(['40%', '72%']);
    expect(layout.lineGrid.left).toBe(16);
    expect(layout.barGrid.left).toBe(56);
    expect(layout.legendTop).toBe('bottom');
  });

  it('returns desktop chart settings by default', () => {
    const layout = buildResponsiveReportChartLayout(false);

    expect(layout.primaryChartHeight).toBe(320);
    expect(layout.secondaryChartHeight).toBe(280);
    expect(layout.pieRadius).toEqual(['30%', '70%']);
    expect(layout.lineGrid.left).toBe(30);
    expect(layout.barGrid.left).toBe(80);
    expect(layout.legendTop).toBe('top');
  });
});
