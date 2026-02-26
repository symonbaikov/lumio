// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const apiPatch = vi.hoisted(() => vi.fn());
const apiDelete = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
    patch: apiPatch,
    delete: apiDelete,
  },
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner-1' },
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('WorkspaceMembersView', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiDelete.mockReset();

    apiGet.mockResolvedValue({
      data: {
        workspace: { id: 'ws-1', name: 'Workspace', ownerId: 'owner-1' },
        members: [
          {
            id: 'owner-1',
            email: 'owner@example.com',
            name: 'Workspace Owner',
            role: 'owner',
            joinedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'viewer-1',
            email: 'viewer@example.com',
            name: 'Viewer User',
            role: 'viewer',
            joinedAt: '2026-01-05T00:00:00.000Z',
          },
        ],
        invitations: [],
      },
    });
  });

  it('renders member controls and pending invitation note', async () => {
    const { default: WorkspaceMembersView } = await import('./WorkspaceMembersView');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkspaceMembersView />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(container.textContent).toContain('Members');
    expect(container.textContent).toContain('Sort: Name');
    expect(container.textContent).toContain('Role: All roles');
    expect(container.textContent).toContain('Invitations expire in 7 days.');
    expect(container.textContent).toContain('No active invitations.');
  });
});
