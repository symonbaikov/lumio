import { fireEvent, render as renderComponent } from '@testing-library/react';
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

type FooterProps = {
  aggregateSelection: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
  aggregateValues: Record<string, number | string | null>;
};

function table(props: FooterProps): React.ReactElement {
  viewportState.isMobile = false;
  return (
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
      onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
      onSelectedRowIdsChange={vi.fn()}
      sorting={[]}
      onSortingChange={vi.fn()}
      conditionalRules={[]}
      aggregateSelection={props.aggregateSelection}
      aggregateValues={props.aggregateValues}
      onAggregateChange={vi.fn()}
    />
  );
}

const render = (props: FooterProps): string => renderToStaticMarkup(table(props));
const renderIntoDom = (props: FooterProps) => renderComponent(table(props));

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
    // На десктопе селект подвала — меню MUI, поэтому опции появляются в DOM
    // только после открытия, а их значения лежат в data-value.
    const offeredFns = (columnIndex: number): string[] => {
      const { container, unmount } = renderIntoDom({
        aggregateSelection: {},
        aggregateValues: {},
      });
      const trigger = container.querySelectorAll('tfoot [role="combobox"]')[columnIndex];
      fireEvent.mouseDown(trigger);
      const fns = Array.from(document.querySelectorAll('[role="option"]')).map(option =>
        option.getAttribute('data-value'),
      );
      unmount();
      return fns.filter((fn): fn is string => fn !== null);
    };

    expect(offeredFns(0)).toContain('sum');
    // Текстовую колонку можно только считать по количеству — суммировать нечего.
    const noteFns = offeredFns(1);
    expect(noteFns).not.toContain('sum');
    expect(noteFns).toContain('count');
  });

  it('formats a money total with the column currency and a percent total with %', () => {
    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-1"
        columns={[
          {
            id: 'col-1',
            key: 'amount',
            title: 'Amount',
            type: 'currency',
            position: 0,
            config: { currency: 'USD' },
          },
          {
            id: 'col-2',
            key: 'share',
            title: 'Share',
            type: 'number',
            position: 1,
            config: { format: 'percent', precision: 1 },
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
        onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
        onSelectedRowIdsChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        conditionalRules={[]}
        aggregateSelection={{ amount: 'sum', share: 'avg' }}
        aggregateValues={{ amount: -1520.5, share: 12.34 }}
        onAggregateChange={vi.fn()}
      />,
    );

    const tfoot = html.slice(html.indexOf('<tfoot'));
    expect(tfoot).toContain('-$1,520.50');
    expect(tfoot).toContain('12.3%');
    // Отрицательная сумма — красным.
    expect(tfoot).toContain('color:var(--destructive)');
  });

  it('shows a dash when the aggregate came back empty', () => {
    const html = render({
      aggregateSelection: { amount: 'sum' },
      aggregateValues: { amount: null },
    });

    expect(html.slice(html.indexOf('<tfoot'))).toContain('—');
  });
});
