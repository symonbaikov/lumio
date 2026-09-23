import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
