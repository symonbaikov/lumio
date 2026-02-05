import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomTableTanStack } from './CustomTableTanStack';

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

vi.mock('@mui/material', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

describe('CustomTableTanStack', () => {
  it('keeps add row button centered during horizontal scroll', () => {
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
});
