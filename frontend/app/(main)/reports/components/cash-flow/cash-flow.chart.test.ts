import { describe, expect, it } from 'vitest';
import { buildCashFlowSankey } from './cash-flow.chart';

const data = {
  sankey: {
    nodes: [
      { id: 'balance', name: 'From your balance', kind: 'balance' as const },
      { id: 'total', name: 'Money flow', kind: 'total' as const },
      { id: 'cat:rent', name: 'Marketing and advertising', kind: 'category' as const },
    ],
    links: [
      { source: 'balance', target: 'total', value: 300 },
      { source: 'total', target: 'cat:rent', value: 300 },
    ],
  },
};

type SankeyNode = { name: string; label?: { position?: string } };

describe('buildCashFlowSankey', () => {
  it('puts the labels of the last column inside the chart so they are not cut off', () => {
    const option = buildCashFlowSankey(data, 'dark', value => String(value));
    const nodes = (option.series as Array<{ data: SankeyNode[] }>)[0].data;

    expect(nodes.find(node => node.name === 'cat:rent')?.label?.position).toBe('left');
    expect(nodes.find(node => node.name === 'balance')?.label?.position).toBeUndefined();
  });
});
