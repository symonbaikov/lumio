import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CustomTableTanStack } from './CustomTableTanStack';

const viewportState = vi.hoisted(() => ({ isMobile: false }));

const createI18nProxy = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'value') {
          return '';
        }
        return createI18nProxy();
      },
    },
  );

vi.mock('@/app/i18n', () => ({ useIntlayer: () => createI18nProxy() }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
vi.mock('@/app/hooks/useIsMobile', () => ({ useIsMobile: () => viewportState.isMobile }));
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  };
});
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({ getVirtualItems: () => [], getTotalSize: () => 0 }),
}));

const COLUMNS = [
  {
    id: 'col-1',
    key: 'amount',
    title: 'Amount',
    type: 'number' as const,
    position: 0,
    config: null,
  },
  { id: 'col-2', key: 'note', title: 'Note', type: 'text' as const, position: 1, config: null },
];

function render(props: {
  aggregateSelection: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
  aggregateValues: Record<string, number | string | null>;
}): string {
  viewportState.isMobile = false;
  return renderToStaticMarkup(
    <CustomTableTanStack
      tableId="table-1"
      columns={COLUMNS}
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
      sorting={[]}
      onSortingChange={vi.fn()}
      conditionalRules={[]}
      aggregateSelection={props.aggregateSelection}
      aggregateValues={props.aggregateValues}
      onAggregateChange={vi.fn()}
    />,
  );
}

describe('custom table aggregate footer', () => {
  it('renders the aggregate value for a column with a selected function', () => {
    const html = render({
      aggregateSelection: { amount: 'sum' },
      aggregateValues: { amount: 1520.5 },
    });

    expect(html).toContain('<tfoot');
    expect(html).toContain('1,520.5');
  });

  it('offers sum only on numeric columns, never on text ones', () => {
    const html = render({ aggregateSelection: {}, aggregateValues: {} });

    // Ячейки подвала опознаём по aria-label селекта: он содержит ключ колонки.
    const footer = html.slice(html.indexOf('<tfoot'));
    const cells = footer.split('</td>');
    const amountCell = cells.find(cell => cell.includes('amount'));
    const noteCell = cells.find(cell => cell.includes('note'));

    expect(amountCell).toBeDefined();
    expect(amountCell).toContain('value="sum"');
    // Текстовую колонку можно только считать по количеству — суммировать нечего.
    expect(noteCell).toBeDefined();
    expect(noteCell).not.toContain('value="sum"');
    expect(noteCell).toContain('value="count"');
  });

  it('shows a dash when the aggregate came back empty', () => {
    const html = render({
      aggregateSelection: { amount: 'sum' },
      aggregateValues: { amount: null },
    });

    expect(html.slice(html.indexOf('<tfoot'))).toContain('—');
  });
});
