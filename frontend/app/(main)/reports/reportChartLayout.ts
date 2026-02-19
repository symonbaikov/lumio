type GridSpec = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type ResponsiveReportChartLayout = {
  primaryChartHeight: number;
  secondaryChartHeight: number;
  pieRadius: [string, string];
  legendTop: 'top' | 'bottom';
  lineGrid: GridSpec;
  barGrid: GridSpec;
};

export const buildResponsiveReportChartLayout = (
  isMobile: boolean,
): ResponsiveReportChartLayout => {
  if (isMobile) {
    return {
      primaryChartHeight: 280,
      secondaryChartHeight: 260,
      pieRadius: ['40%', '72%'],
      legendTop: 'bottom',
      lineGrid: {
        left: 16,
        right: 16,
        top: 20,
        bottom: 40,
      },
      barGrid: {
        left: 56,
        right: 12,
        top: 20,
        bottom: 30,
      },
    };
  }

  return {
    primaryChartHeight: 320,
    secondaryChartHeight: 280,
    pieRadius: ['30%', '70%'],
    legendTop: 'top',
    lineGrid: {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30,
    },
    barGrid: {
      left: 80,
      right: 20,
      top: 20,
      bottom: 30,
    },
  };
};
