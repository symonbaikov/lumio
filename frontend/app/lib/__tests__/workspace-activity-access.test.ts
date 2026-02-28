import { describe, expect, it } from 'vitest';

import { canAccessWorkspaceActivity } from '../workspace-activity-access';

describe('canAccessWorkspaceActivity', () => {
  it('returns true for workspace owner', () => {
    expect(canAccessWorkspaceActivity('owner')).toBe(true);
  });

  it('returns true for workspace admin', () => {
    expect(canAccessWorkspaceActivity('admin')).toBe(true);
  });

  it('returns false for workspace member', () => {
    expect(canAccessWorkspaceActivity('member')).toBe(false);
  });

  it('returns false for workspace viewer', () => {
    expect(canAccessWorkspaceActivity('viewer')).toBe(false);
  });

  it('returns false when role is missing', () => {
    expect(canAccessWorkspaceActivity()).toBe(false);
  });
});
