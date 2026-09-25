import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '@/app/test/select';
import { CustomTableTanStack } from './CustomTableTanStack';

const viewportState = vi.hoisted(() => ({ isMobile: false }));
// Гридом управляет виртуализатор: пока он отдаёт пустой список, строки не
// рендерятся вовсе. По умолчанию 0, чтобы прежние тесты не поменяли поведение.
const virtualState = vi.hoisted(() => ({ rowCount: 0 }));

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

vi.mock('@/app/i18n', () => ({
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

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () =>
      Array.from({ length: virtualState.rowCount }, (_, index) => ({
        index,
        key: index,
        start: index * 40,
        end: (index + 1) * 40,
        size: 40,
      })),
    getTotalSize: () => virtualState.rowCount * 40,
  }),
}));

describe('CustomTableTanStack', () => {
  beforeEach(() => {
    virtualState.rowCount = 0;
  });

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
        onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
        onSelectedRowIdsChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        conditionalRules={[]}
        aggregateSelection={{}}
        aggregateValues={{}}
        onAggregateChange={vi.fn()}
      />,
    );

    // Подвал с кнопкой лежит за таблицей и позиционируется инлайновыми стилями
    // (Tailwind-классов в этом компоненте нет), поэтому проверяем их.
    expect(html).toMatch(/<\/table>[\s\S]*data-testid="custom-table-add-row"/);
    const addRowStyle = /data-testid="custom-table-add-row"[^>]*style="([^"]*)"/.exec(html)?.[1];
    expect(addRowStyle).toContain('position:sticky');
    expect(addRowStyle).toContain('left:0');
    expect(addRowStyle).toContain('width:100%');
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
        onRenameColumnTitle={vi.fn().mockResolvedValue(undefined)}
        onSelectedRowIdsChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        conditionalRules={[]}
        aggregateSelection={{}}
        aggregateValues={{}}
        onAggregateChange={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="custom-table-mobile-card-row-1"');
    expect(html).toContain('Name');
    expect(html).toContain('Alice');
    expect(html).not.toContain('<table');
  });

  it('marks a draft row and highlights the required cell it still needs', () => {
    viewportState.isMobile = false;
    virtualState.rowCount = 1;

    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-1"
        columns={[
          {
            id: 'col-1',
            key: 'client',
            title: 'Client',
            type: 'text',
            position: 0,
            config: null,
            isRequired: true,
          },
          {
            id: 'col-2',
            key: 'project',
            title: 'Project',
            type: 'text',
            position: 1,
            config: null,
          },
        ]}
        rows={[{ id: 'temp-1', rowNumber: 1, data: { project: 'Redesign' }, styles: null }]}
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
        aggregateSelection={{}}
        aggregateValues={{}}
        onAggregateChange={vi.fn()}
      />,
    );

    // Маркер вместо номера строки и рамка на пустой обязательной ячейке.
    expect(html).toContain('Draft: the row is saved once the required fields are filled in');
    expect(html).toContain('inset 0 0 0 1px');
    // Заполненная необязательная колонка подсвечиваться не должна.
    expect(html.match(/inset 0 0 0 1px/g)).toHaveLength(1);
  });

  const gridCallbacks = () => ({
    selectedRowIds: [] as string[],
    columnWidths: {},
    isFullscreen: false,
    loadingRows: false,
    hasMore: false,
    stickyLeftColumnIds: [] as string[],
    stickyRightColumnIds: [] as string[],
    onLoadMore: vi.fn(),
    onFiltersParamChange: vi.fn(),
    onUpdateCell: vi.fn().mockResolvedValue(undefined),
    onUpdateRowStyle: vi.fn().mockResolvedValue(undefined),
    onDeleteRow: vi.fn(),
    onPersistColumnWidth: vi.fn().mockResolvedValue(undefined),
    onRenameColumnTitle: vi.fn().mockResolvedValue(undefined),
    onSelectedRowIdsChange: vi.fn(),
    sorting: [],
    onSortingChange: vi.fn(),
    conditionalRules: [],
    aggregateSelection: {},
    aggregateValues: {},
    onAggregateChange: vi.fn(),
  });

  it('paints header and column colours on the th/td, not on an inner box', () => {
    viewportState.isMobile = false;
    virtualState.rowCount = 1;

    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-1"
        {...gridCallbacks()}
        columns={[
          {
            id: 'col-1',
            key: 'amount',
            title: 'Amount',
            type: 'number',
            position: 0,
            config: null,
            style: { header: { backgroundColor: '#112233' }, cell: { backgroundColor: '#445566' } },
          },
        ]}
        rows={[{ id: 'row-1', rowNumber: 1, data: { amount: 5 } }]}
      />,
    );

    const ths = [...html.matchAll(/<th\s[^>]*style="([^"]*)"/g)].map(m => m[1]);
    expect(ths.some(style => style.includes('background-color:#112233'))).toBe(true);
    const tds = [...html.matchAll(/<td[^>]*style="([^"]*)"/g)].map(m => m[1]);
    expect(tds.some(style => style.includes('background-color:#445566'))).toBe(true);
  });

  it('paints the whole row for a row-scoped rule', () => {
    viewportState.isMobile = false;
    virtualState.rowCount = 1;

    const html = renderToStaticMarkup(
      <CustomTableTanStack
        tableId="table-1"
        {...gridCallbacks()}
        conditionalRules={[
          {
            id: 'r1',
            col: 'amount',
            op: 'gt',
            value: '1',
            target: 'row',
            style: { backgroundColor: '#fee2e2' },
          },
        ]}
        columns={[
          { id: 'col-1', key: 'amount', title: 'Amount', type: 'number', position: 0, config: null },
          { id: 'col-2', key: 'note', title: 'Note', type: 'text', position: 1, config: null },
        ]}
        rows={[{ id: 'row-1', rowNumber: 1, data: { amount: 5, note: 'x' } }]}
      />,
    );

    const tr = [...html.matchAll(/<tr[^>]*style="([^"]*)"/g)].map(m => m[1]);
    expect(tr.some(style => style.includes('background-color:#fee2e2'))).toBe(true);
    const tbody = /<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1] ?? '';
    const tds = [...tbody.matchAll(/<td[^>]*style="([^"]*)"/g)].map(m => m[1]);
    // Все ячейки строки — данные, номер, чекбокс, действия, «+» — в цвете строки.
    expect(tds.length).toBeGreaterThanOrEqual(5);
    expect(tds.every(style => style.includes('background-color:#fee2e2'))).toBe(true);
  });

  it('opens the select cell in a portal outside the grid and saves the pick', () => {
    viewportState.isMobile = false;
    virtualState.rowCount = 1;
    const props = gridCallbacks();

    render(
      <CustomTableTanStack
        tableId="table-1"
        {...props}
        columns={[
          {
            id: 'col-1',
            key: 'stage',
            title: 'Stage',
            type: 'select',
            position: 0,
            config: { options: ['Lead', 'Won'] },
          },
        ]}
        rows={[{ id: 'row-1', rowNumber: 1, data: { stage: 'Lead' } }]}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Open select options' });
    selectOption(trigger, 'Won');

    expect(props.onUpdateCell).toHaveBeenCalledWith('row-1', 'stage', 'Won');
    expect(document.querySelector('td [role="listbox"]')).toBeNull();
  });
});
