'use client';

import Box from '@mui/material/Box';
import { useMemo, useState } from 'react';
import { categoryColorFor } from '@/app/lib/category-defaults';
import { layoutTreemap } from './treemap-layout';
import type { CashFlowMapData } from './useCashFlowMap';

interface CashFlowTreemapProps {
  items: CashFlowMapData['treemap'];
  formatAmount: (value: number) => string;
  height?: number;
}

/** Categories as tiles sized by spend; click a tile to see its subcategories. */
export function CashFlowTreemap({ items, formatAmount, height = 320 }: CashFlowTreemapProps) {
  const [focus, setFocus] = useState<string | null>(null);
  const width = 1000; // Laid out in a fixed frame and scaled by the SVG viewBox.
  const focused = items.find(item => item.id === focus);
  const tiles = useMemo(() => {
    const source = focused && focused.children.length > 0 ? focused.children : items;
    return layoutTreemap(source, width, height).map(tile => ({
      ...tile,
      item: source.find(entry => entry.id === tile.id) as {
        id: string;
        name: string;
        value: number;
      },
    }));
  }, [focused, items, height]);

  if (items.length === 0) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={focused ? focused.name : 'treemap'}
        style={{ display: 'block', borderRadius: 8 }}
      >
        {tiles.map(tile => (
          <g
            key={tile.id}
            role="button"
            tabIndex={0}
            aria-label={`${tile.item.name} ${formatAmount(tile.item.value)}`}
            onClick={() => setFocus(focused ? null : tile.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFocus(focused ? null : tile.id);
              }
            }}
            style={{ cursor: 'pointer' }}
            data-testid={`treemap-tile-${tile.id}`}
          >
            <rect
              x={tile.x}
              y={tile.y}
              width={tile.width}
              height={tile.height}
              fill={categoryColorFor(tile.item.name, null)}
              stroke="var(--background, #fff)"
              strokeWidth={3}
              rx={6}
            />
            {tile.width > 90 && tile.height > 34 && (
              <text
                x={tile.x + 10}
                y={tile.y + 22}
                fill="#fff"
                fontSize={14}
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {tile.item.name}
                <tspan x={tile.x + 10} dy={18} fontSize={12} fontWeight={400}>
                  {formatAmount(tile.item.value)}
                </tspan>
              </text>
            )}
          </g>
        ))}
      </svg>
    </Box>
  );
}
