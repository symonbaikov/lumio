import { describe, expect, it } from 'vitest';
import { filterSubscriptions } from './subscription-filter.utils';

const subscriptions = [
  {
    vendorName: 'Claude',
    status: 'active',
    ownerId: 'user-1',
    category: { name: 'AI' },
    riskStatus: 'price_changed',
  },
  {
    vendorName: 'Figma',
    status: 'active',
    ownerId: 'user-2',
    category: { name: 'Design' },
    riskStatus: 'none',
  },
];

describe('filterSubscriptions', () => {
  it('narrows the management table by search, owner, category, and risk', () => {
    expect(
      filterSubscriptions(subscriptions, {
        search: 'claude',
        ownerId: 'user-1',
        categoryId: 'AI',
        riskStatus: 'price_changed',
      }),
    ).toEqual([subscriptions[0]]);
  });
});
