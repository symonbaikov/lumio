import { categoryColorFor } from '@/app/lib/category-defaults';
import { tokens } from '@/lib/theme-tokens';
import type { CashFlowMapData } from './useCashFlowMap';

/** ECharts sankey option for the cash-flow map; free of React so it can be asserted. */
export function buildCashFlowSankey(
  data: Pick<CashFlowMapData, 'sankey'>,
  resolvedTheme: string | undefined,
  formatAmount: (value: number) => string,
): Record<string, unknown> {
  const isDark = resolvedTheme === 'dark';
  const color = isDark ? tokens.dark.color : tokens.color;
  const byId = new Map(data.sankey.nodes.map(node => [node.id, node]));
  // Labels sit right of their node by default; the last column has no room there.
  const hasOutflow = new Set(data.sankey.links.map(link => link.source));
  const nodeColor = (kind: string, name: string): string => {
    switch (kind) {
      case 'source':
      case 'saved':
        return color.success;
      case 'balance':
        return color.warning;
      case 'total':
        return color.primary;
      case 'transfers':
        return color.catOther;
      default:
        return categoryColorFor(name, null);
    }
  };
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: { dataType?: string; name?: string; value?: unknown }) => {
        if (params.dataType === 'edge') return formatAmount(Number(params.value ?? 0));
        const node = byId.get(String(params.name ?? ''));
        return node ? node.name : '';
      },
    },
    series: [
      {
        type: 'sankey',
        left: 8,
        right: 8,
        top: 12,
        bottom: 12,
        emphasis: { focus: 'adjacency' },
        nodeGap: 10,
        nodeWidth: 14,
        draggable: false,
        label: {
          color: color.textPrimary,
          fontSize: 11,
          formatter: (params: { name?: string }) => byId.get(String(params.name ?? ''))?.name ?? '',
        },
        lineStyle: { color: 'gradient', opacity: isDark ? 0.35 : 0.28, curveness: 0.5 },
        data: data.sankey.nodes.map(node => ({
          name: node.id,
          itemStyle: { color: nodeColor(node.kind, node.name) },
          ...(hasOutflow.has(node.id) ? {} : { label: { position: 'left' } }),
        })),
        links: data.sankey.links,
      },
    ],
  };
}
