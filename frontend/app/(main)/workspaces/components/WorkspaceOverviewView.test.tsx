// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: 'ws-1',
      name: 'Denis workspace',
      description: 'Workspace description',
      currency: 'EUR',
      backgroundImage: null,
      settings: {},
      memberRole: 'owner',
    },
    refreshWorkspaces: vi.fn(),
    clearWorkspace: vi.fn(),
    updateWorkspaceBackground: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WorkspaceOverviewView', () => {
  it('renders currency picker trigger instead of native select', async () => {
    const { default: WorkspaceOverviewView } = await import('./WorkspaceOverviewView');
    const html = renderToStaticMarkup(<WorkspaceOverviewView />);

    expect(html).toContain('data-testid="workspace-currency-trigger"');
    expect(html).not.toContain('id="workspace-currency"');
    expect(html).not.toContain('Plan type');
    expect(html).not.toContain('Company address');
  });
});
