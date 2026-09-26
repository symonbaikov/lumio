// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShellSidePanel from './ShellSidePanel';
import type { SidePanelPageConfig } from './side-panel';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  hookCalls: [] as Array<string | undefined>,
  registered: [] as SidePanelPageConfig[],
}));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));

vi.mock('@/app/(main)/statements/components/StatementsSidePanel', async () => {
  const actual = await vi.importActual<
    typeof import('@/app/(main)/statements/components/StatementsSidePanel')
  >('@/app/(main)/statements/components/StatementsSidePanel');
  return {
    getStatementsActiveItem: actual.getStatementsActiveItem,
    useStatementsSidePanelConfig: (activeItem?: string): SidePanelPageConfig => {
      mocks.hookCalls.push(activeItem);
      return { pageId: `statements:${activeItem ?? 'none'}`, sections: [] };
    },
  };
});

vi.mock('./side-panel', () => ({
  useSidePanelConfig: ({ config }: { config: SidePanelPageConfig }) => {
    mocks.registered.push(config);
  },
  SidePanel: ({ config }: { config: SidePanelPageConfig }) => (
    <aside data-testid="side-panel" data-page-id={config.pageId} />
  ),
}));

describe('ShellSidePanel', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard';
    mocks.hookCalls = [];
    mocks.registered = [];
  });

  it('is in the server HTML, so it shows from the first paint like the main sidebar', () => {
    const html = renderToString(<ShellSidePanel />);
    expect(html).toContain('lumio-shell__side-panel');
    expect(html).toContain('data-page-id="statements:none"');
  });

  it('shows the statements panel on any page, with nothing active off the queue pages', () => {
    render(<ShellSidePanel />);
    expect(screen.getByTestId('side-panel')).toHaveAttribute('data-page-id', 'statements:none');
  });

  it('keeps the same column across page switches, marking the item from the URL', () => {
    mocks.pathname = '/statements/submit';
    const { rerender } = render(<ShellSidePanel />);
    const column = screen.getByTestId('side-panel');

    mocks.pathname = '/statements/approve';
    rerender(<ShellSidePanel />);

    expect(screen.getByTestId('side-panel')).toBe(column);
    expect(column).toHaveAttribute('data-page-id', 'statements:approve');
  });

  it('hands the panel to the phone drawer only on queue pages', () => {
    render(<ShellSidePanel />);
    expect(mocks.registered).toEqual([]);

    mocks.pathname = '/statements/pay';
    render(<ShellSidePanel />);
    expect(mocks.registered.at(-1)?.pageId).toBe('statements:pay');
  });
});
