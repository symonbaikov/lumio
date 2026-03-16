// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    loading: 'Loading...',
    noWorkspaces: 'No workspaces',
    createWorkspace: 'Create Workspace',
    searchPlaceholder: 'Search workspaces...',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    workspaces: [
      {
        id: 'ws-1',
        name: 'Main Workspace',
        description: 'Workspace description',
        isFavorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    loading: false,
    switchWorkspace: vi.fn(),
    refreshWorkspaces: vi.fn(),
  }),
}));

vi.mock('./WorkspaceCard', () => ({
  WorkspaceCard: () => <div>workspace-card</div>,
}));

vi.mock('./CreateWorkspaceModal', () => ({
  CreateWorkspaceModal: () => null,
}));

describe('WorkspacesListContent', () => {
  it('does not render embedded workspace switch header', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const html = renderToStaticMarkup(<WorkspacesListContent embedded onCloseEmbedded={vi.fn()} />);

    expect(html).not.toContain('Switch workspace without leaving this page');
    expect(html).not.toContain('All Workspaces');
    expect(html).not.toContain('Close');
  });

  it('renders statements-style search bar in embedded mode', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkspacesListContent embedded onCloseEmbedded={vi.fn()} />);
    });

    const searchInput = container.querySelector('input[aria-label="Search workspaces..."]');
    expect(searchInput).toBeTruthy();
    expect(searchInput?.className).toContain('pl-11');
    expect(searchInput?.className).toContain('rounded-md');
  });

  it('switches to list format when list view button is clicked', async () => {
    const { default: WorkspacesListContent } = await import('./WorkspacesListContent');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkspacesListContent />);
    });

    expect(container.textContent).toContain('workspace-card');

    const listViewButton = container.querySelector(
      'button[title="List view"]',
    ) as HTMLButtonElement;
    expect(listViewButton).toBeTruthy();

    await act(async () => {
      listViewButton.click();
    });

    expect(container.textContent).toContain('Workspace name');
    expect(container.textContent).not.toContain('workspace-card');
    expect(container.textContent).toContain('Main Workspace');
  });
});
