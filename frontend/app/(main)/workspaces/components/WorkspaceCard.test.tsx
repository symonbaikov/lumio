// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceCard } from './WorkspaceCard';

vi.mock('@/app/lib/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('WorkspaceCard', () => {
  it('does not render nested button elements', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceCard
          workspace={{
            id: 'ws-1',
            name: 'Workspace',
            description: 'Desc',
            icon: null,
            backgroundImage: null,
            isFavorite: false,
          }}
          onClick={vi.fn()}
          onFavoriteToggle={vi.fn()}
        />,
      );
    });

    expect(container.querySelectorAll('button button').length).toBe(0);
  });
});
