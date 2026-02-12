'use client';

import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type Item = {
  name: string;
  amount: number;
  color?: string | null;
};

type Props = {
  title: string;
  items: Item[];
};

export default function TopCategoriesChart({ title, items }: Props) {
  const option = {
    grid: {
      top: 16,
      left: 12,
      right: 12,
      bottom: 8,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      valueFormatter: (value: number) =>
        new Intl.NumberFormat('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value),
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748b',
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: items.map(item => item.name),
      axisLabel: {
        color: '#0f172a',
      },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: title,
        type: 'bar',
        data: items.map(item => ({
          value: Number(item.amount || 0),
          itemStyle: item.color
            ? {
                color: item.color,
              }
            : undefined,
        })),
        barWidth: 18,
        borderRadius: [0, 10, 10, 0],
        itemStyle: {
          color: '#0E58A8',
        },
      },
    ],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-800">{title}</div>
      <ReactECharts option={option} style={{ height: 320 }} notMerge lazyUpdate />
    </div>
  );
}
