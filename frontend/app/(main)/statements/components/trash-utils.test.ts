import { describe, expect, it } from 'vitest';
import { resolvePermanentDeletionDate, resolveTrashEntityType } from './trash-utils';

describe('resolveTrashEntityType', () => {
  it('defaults to statement when type is missing', () => {
    expect(resolveTrashEntityType({})).toBe('statement');
  });

  it('resolves workspace type from entityType field', () => {
    expect(resolveTrashEntityType({ entityType: 'workspace' })).toBe('workspace');
  });

  it('resolves table type from alternative fields', () => {
    expect(resolveTrashEntityType({ resourceType: 'custom_table' })).toBe('table');
  });
});

describe('resolvePermanentDeletionDate', () => {
  it('returns null for missing date', () => {
    expect(resolvePermanentDeletionDate(undefined, 30)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(resolvePermanentDeletionDate('not-a-date', 30)).toBeNull();
  });

  it('adds ttl days to deletedAt', () => {
    const result = resolvePermanentDeletionDate('2026-01-01T00:00:00.000Z', 30);
    expect(result?.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
