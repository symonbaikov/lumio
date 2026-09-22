import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useColumnConfig } from './useColumnConfig';

const TABLE_ID = 'table-1';
const STORAGE_KEY = `custom-table:${TABLE_ID}:columns`;
const COLUMNS = [{ key: 'col_a' }, { key: 'col_b' }];

function renderColumnConfig(orderedColumns: { key: string }[]) {
  return renderHook(
    (props: { orderedColumns: { key: string }[] }) =>
      useColumnConfig({
        tableId: TABLE_ID,
        orderedColumns: props.orderedColumns,
        viewSettings: null,
        isAuthenticated: false,
        columnWidthSaveFailedMessage: 'failed',
      }),
    { initialProps: { orderedColumns } },
  );
}

describe('useColumnConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Регрессия: эффект записи отрабатывал на монтировании с ещё пустым стейтом и
  // затирал в localStorage то, что эффект чтения только что прочитал.
  it('keeps stored column order and hidden columns after mount', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ order: ['col_b', 'col_a'], hidden: ['col_b'] }),
    );

    const { result } = renderColumnConfig(COLUMNS);

    await waitFor(() => expect(result.current.hiddenColumnKeys).toEqual(['col_b']));
    expect(result.current.columnOrder).toEqual(['col_b', 'col_a']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual({
      order: ['col_b', 'col_a'],
      hidden: ['col_b'],
    });
  });

  // Регрессия: на первом рендере колонки ещё не пришли с сервера, и чистка по
  // пустому списку ключей стирала восстановленные настройки.
  it('does not drop restored settings while columns are still loading', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: ['col_a'], hidden: ['col_a'] }));

    const { result, rerender } = renderColumnConfig([]);

    await waitFor(() => expect(result.current.hiddenColumnKeys).toEqual(['col_a']));

    rerender({ orderedColumns: COLUMNS });

    await waitFor(() => expect(result.current.columnOrder).toEqual(['col_a', 'col_b']));
    expect(result.current.hiddenColumnKeys).toEqual(['col_a']);
  });

  it('prunes columns that no longer exist once the real columns arrive', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ order: ['col_a', 'col_gone'], hidden: ['col_gone'] }),
    );

    const { result } = renderColumnConfig(COLUMNS);

    await waitFor(() => expect(result.current.columnOrder).toEqual(['col_a', 'col_b']));
    expect(result.current.hiddenColumnKeys).toEqual([]);
  });
});
