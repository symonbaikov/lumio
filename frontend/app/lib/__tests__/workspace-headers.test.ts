import { beforeEach, describe, expect, it } from 'vitest';
import { getWorkspaceHeaders } from '../workspace-headers';

describe('getWorkspaceHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns authorization and workspace headers when present', () => {
    localStorage.setItem('access_token', 'token-123');
    localStorage.setItem('currentWorkspaceId', 'workspace-abc');

    expect(getWorkspaceHeaders()).toEqual({
      Authorization: 'Bearer token-123',
      'X-Workspace-Id': 'workspace-abc',
    });
  });

  it('returns only authorization header when workspace is missing', () => {
    localStorage.setItem('access_token', 'token-123');

    expect(getWorkspaceHeaders()).toEqual({
      Authorization: 'Bearer token-123',
    });
  });

  it('returns workspace header when token is missing', () => {
    localStorage.setItem('currentWorkspaceId', 'workspace-abc');

    expect(getWorkspaceHeaders()).toEqual({
      'X-Workspace-Id': 'workspace-abc',
    });
  });
});
