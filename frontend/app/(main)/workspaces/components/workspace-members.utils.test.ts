import { describe, expect, it } from 'vitest';
import { filterAndSortMembers } from './workspace-members.utils';

const members = [
  {
    id: '1',
    name: 'Zoe Barton',
    email: 'zoe@example.com',
    role: 'viewer',
    joinedAt: '2025-02-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Adam Smith',
    email: 'adam@example.com',
    role: 'admin',
    joinedAt: '2025-03-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Owner User',
    email: 'owner@example.com',
    role: 'owner',
    joinedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '4',
    name: undefined,
    email: 'member@example.com',
    role: 'member',
    joinedAt: '2025-04-01T00:00:00.000Z',
  },
];

describe('filterAndSortMembers', () => {
  it('filters by email query case-insensitively', () => {
    const result = filterAndSortMembers(members, {
      searchEmail: 'OWNER@',
      roleFilter: 'all',
      sortBy: 'name',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe('owner@example.com');
  });

  it('filters by role when role filter is selected', () => {
    const result = filterAndSortMembers(members, {
      searchEmail: '',
      roleFilter: 'viewer',
      sortBy: 'name',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe('viewer');
  });

  it('sorts by role using workspace hierarchy', () => {
    const result = filterAndSortMembers(members, {
      searchEmail: '',
      roleFilter: 'all',
      sortBy: 'role',
    });

    expect(result.map(member => member.role)).toEqual(['owner', 'admin', 'member', 'viewer']);
  });

  it('sorts by join date with newest first', () => {
    const result = filterAndSortMembers(members, {
      searchEmail: '',
      roleFilter: 'all',
      sortBy: 'joinedAt',
    });

    expect(result.map(member => member.id)).toEqual(['4', '2', '1', '3']);
  });
});
