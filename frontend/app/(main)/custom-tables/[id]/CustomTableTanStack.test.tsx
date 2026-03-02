import { render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CustomTablesPage from '../page';
import { CustomTableTanStack } from './CustomTableTanStack';

const viewportState = vi.hoisted(() => ({ isMobile: false }));

const createI18nProxy = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'value') return '';
        return createI18nProxy();
      },
    },
  );

vi.mock('next-intlayer', () => ({
  useIntlayer: () => createI18nProxy(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => viewportState.isMobile,
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}));

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

describe('CustomTableTanStack', () => {
  it('keeps add row button centered during horizontal scroll', () => {
    viewportState.isMobile = false;

    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-1"
        columns={[
          {
            id: 'col-1',
            key: 'name',
            title: 'Name',
            type: 'text',
            position: 0,
            config: null,
          },
        ]}
        rows={[]}
        selectedRowIds={[]}
        columnWidths={{}}
        isFullscreen={false}
        loadingRows={false}
        hasMore={false}
        stickyLeftColumnIds={[]}
        stickyRightColumnIds={[]}
        onLoadMore={vi.fn()}
        onFiltersParamChange={vi.fn()}
        onUpdateCell={vi.fn().mockResolvedValue(undefined)}
        onUpdateRowStyle={vi.fn().mockResolvedValue(undefined)}
        onDeleteRow={vi.fn()}
        onPersistColumnWidth={vi.fn().mockResolvedValue(undefined)}
        selectedColumnKeys={[]}
        onSelectedColumnKeysChange={vi.fn()}
        onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
        onSelectedRowIdsChange={vi.fn()}
      />,
    );

    expect(html).toMatch(/<\/table>[\s\S]*data-testid="custom-table-add-row"/);
    expect(html).toMatch(/data-testid="custom-table-add-row"[^>]*\bsticky\b/);
    expect(html).toMatch(/data-testid="custom-table-add-row"[^>]*\bleft-0\b/);
    expect(html).toMatch(/data-testid="custom-table-add-row"[^>]*\bw-full\b/);
  });

  it('renders mobile cards instead of table on mobile viewport', () => {
    viewportState.isMobile = true;

    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-mobile"
        columns={[
          {
            id: 'col-1',
            key: 'name',
            title: 'Name',
            type: 'text',
            position: 0,
            config: null,
          },
          {
            id: 'col-2',
            key: 'active',
            title: 'Active',
            type: 'boolean',
            position: 1,
            config: null,
          },
        ]}
        rows={[
          {
            id: 'row-1',
            rowNumber: 1,
            data: {
              name: 'Alice',
              active: true,
            },
          },
        ]}
        selectedRowIds={[]}
        columnWidths={{}}
        isFullscreen={false}
        loadingRows={false}
        hasMore={false}
        stickyLeftColumnIds={[]}
        stickyRightColumnIds={[]}
        onLoadMore={vi.fn()}
        onFiltersParamChange={vi.fn()}
        onUpdateCell={vi.fn().mockResolvedValue(undefined)}
        onUpdateRowStyle={vi.fn().mockResolvedValue(undefined)}
        onDeleteRow={vi.fn()}
        onPersistColumnWidth={vi.fn().mockResolvedValue(undefined)}
        selectedColumnKeys={[]}
        onSelectedColumnKeysChange={vi.fn()}
        onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
        onSelectedRowIdsChange={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="custom-table-mobile-card-row-1"');
    expect(html).toContain('Name');
    expect(html).toContain('Alice');
    expect(html).not.toContain('<table');
  });
});

describe('CustomTablesPage', () => {
  it('renders loading indicator while fetching tables', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/custom-tables') {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<CustomTablesPage />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
