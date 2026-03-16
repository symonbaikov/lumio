import { describe, expect, it } from 'vitest';
import { resolvePageTitle } from './page-title';

describe('resolvePageTitle', () => {
  it('resolves known route titles', () => {
    expect(resolvePageTitle('/dashboard')).toBe('Lumio — Dashboard');
    expect(resolvePageTitle('/statements/spend-over-time')).toBe('Lumio — Spend over time');
    expect(resolvePageTitle('/workspaces/members')).toBe('Lumio — Workspace members');
  });

  it('falls back to product title for unknown routes', () => {
    expect(resolvePageTitle('/unknown-page')).toBe('Lumio — Bank statement processing');
  });
});
