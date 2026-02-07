import { describe, expect, it } from 'vitest';

import {
  filterStatementCategories,
  flattenStatementCategories,
} from '../statement-categories';

describe('statement categories helpers', () => {
  const categories = [
    {
      id: '1',
      name: 'Equipment',
      children: [
        {
          id: '1-1',
          name: 'Laptop',
        },
      ],
    },
    {
      id: '2',
      name: 'Advertising',
    },
  ];

  it('flattens nested categories with parent path', () => {
    expect(flattenStatementCategories(categories)).toEqual([
      {
        id: '1',
        name: 'Equipment',
      },
      {
        id: '1-1',
        name: 'Equipment / Laptop',
      },
      {
        id: '2',
        name: 'Advertising',
      },
    ]);
  });

  it('filters flattened categories by search query', () => {
    expect(filterStatementCategories(categories, 'lap')).toEqual([
      {
        id: '1-1',
        name: 'Equipment / Laptop',
      },
    ]);
  });

  it('returns all flattened categories when query is empty', () => {
    expect(filterStatementCategories(categories, '   ')).toHaveLength(3);
  });
});
