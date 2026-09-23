import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const patch = vi.fn();

vi.mock('@/app/lib/api', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';
import { useRowActions } from './useRowActions';

const column = (key: string, isRequired: boolean): CustomTableColumn => ({
  id: key,
  key,
  title: key,
  type: 'text',
  position: 0,
  config: null,
  isRequired,
});

const noop = async (): Promise<void> => undefined;

function renderRowActions(columns: CustomTableColumn[]) {
  return renderHook(() => {
    const [rows, setRows] = useState<CustomTableGridRow[]>([]);
    const actions = useRowActions({
      tableId: 't1',
      paidColKey: null,
      columns,
      rows,
      displayRows: rows,
      setRows,
      refreshStats: noop,
      openRowDrawer: () => undefined,
      closeRowDrawer: () => undefined,
      messages: {
        addRowLoading: 'loading',
        addRowSuccess: 'ok',
        addRowFailed: 'add failed',
        saveValueFailed: 'save failed',
        noMoreRows: 'no more',
      },
    });
    return { rows, actions };
  });
}

describe('useRowActions draft rows', () => {
  beforeEach(() => {
    post.mockReset();
    patch.mockReset().mockResolvedValue({ data: {} });
  });

  it('adds the row locally without touching the server', async () => {
    const { result } = renderRowActions([column('client', true)]);

    await act(async () => {
      await result.current.actions.createRow();
    });

    expect(post).not.toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].id).toMatch(/^temp-/);
  });

  it('keeps the draft local while a required column is still empty', async () => {
    const { result } = renderRowActions([column('client', true), column('project', false)]);

    await act(async () => {
      await result.current.actions.createRow();
    });
    const draftId = result.current.rows[0].id;
    await act(async () => {
      await result.current.actions.updateCellFromGrid(draftId, 'project', 'Redesign');
    });

    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    expect(result.current.rows[0].data).toEqual({ project: 'Redesign' });
  });

  it('posts once with every collected value when the last required cell is filled', async () => {
    post.mockResolvedValue({
      data: { id: 'server-1', rowNumber: 7, data: { project: 'Redesign', client: 'Atlas' } },
    });
    const { result } = renderRowActions([column('client', true), column('project', false)]);

    await act(async () => {
      await result.current.actions.createRow();
    });
    const draftId = result.current.rows[0].id;
    await act(async () => {
      await result.current.actions.updateCellFromGrid(draftId, 'project', 'Redesign');
    });
    await act(async () => {
      await result.current.actions.updateCellFromGrid(draftId, 'client', 'Atlas');
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/custom-tables/t1/rows', {
      data: { project: 'Redesign', client: 'Atlas' },
    });
    expect(result.current.rows[0].id).toBe('server-1');
    expect(result.current.rows[0].rowNumber).toBe(7);
  });

  it('leaves the row as a draft when the server rejects it', async () => {
    post.mockRejectedValue(new Error('duplicate value'));
    const { result } = renderRowActions([column('client', true)]);

    await act(async () => {
      await result.current.actions.createRow();
    });
    const draftId = result.current.rows[0].id;
    await act(async () => {
      await result.current.actions.updateCellFromGrid(draftId, 'client', 'Atlas');
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.current.rows[0].id).toBe(draftId);
    expect(result.current.rows[0].data).toEqual({ client: 'Atlas' });
  });

  it('posts on the first filled cell when the table has no required columns', async () => {
    post.mockResolvedValue({ data: { id: 'server-2', rowNumber: 1, data: { note: 'hello' } } });
    const { result } = renderRowActions([column('note', false)]);

    await act(async () => {
      await result.current.actions.createRow();
    });
    const draftId = result.current.rows[0].id;
    await act(async () => {
      await result.current.actions.updateCellFromGrid(draftId, 'note', 'hello');
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.current.rows[0].id).toBe('server-2');
  });
});
