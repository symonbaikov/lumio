'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import type { ColumnStylePatch } from '../components/headers/ColumnHeaderMenu';
import { normalizeSelectOptions } from '../utils/selectOptions';
import type { ColumnType, CustomTableColumnConfig, SelectOptionDef } from '../utils/stylingUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';

export const DEFAULT_COLUMN_CURRENCY = 'KZT';

export interface NewColumnDraft {
  title: string;
  type: ColumnType;
  /** Используется только когда type === 'currency'. */
  currency: string;
  /** Используется только когда type === 'formula'. */
  expression: string;
  isRequired: boolean;
  isUnique: boolean;
  /** Используется только когда type === 'relation'. */
  targetTableId: string;
  /** Используется только когда type === 'ai'. */
  prompt: string;
  /** Знаков после запятой для number/currency/formula; пусто — по умолчанию. */
  precision: string;
  /** Как показывать number/formula. */
  format: 'plain' | 'percent';
  /** Опции select/multi_select с цветом. */
  options: SelectOptionDef[];
}

export const EMPTY_COLUMN_DRAFT: NewColumnDraft = {
  title: '',
  type: 'text',
  currency: DEFAULT_COLUMN_CURRENCY,
  expression: '',
  isRequired: false,
  isUnique: false,
  targetTableId: '',
  prompt: '',
  precision: '',
  format: 'plain',
  options: [],
};

export const emptyColumnDraft = (defaultCurrency?: string): NewColumnDraft => ({
  ...EMPTY_COLUMN_DRAFT,
  currency: defaultCurrency || DEFAULT_COLUMN_CURRENCY,
});

/** Черновик формы из существующей колонки — для окна редактирования. */
export function draftFromColumn(column: CustomTablePageColumn): NewColumnDraft {
  const config = column.config ?? {};
  return {
    title: column.title,
    type: column.type,
    currency: typeof config.currency === 'string' ? config.currency : DEFAULT_COLUMN_CURRENCY,
    expression: typeof config.expression === 'string' ? config.expression : '',
    isRequired: Boolean(column.isRequired),
    isUnique: Boolean(column.isUnique),
    targetTableId: typeof config.targetTableId === 'string' ? config.targetTableId : '',
    prompt: typeof config.prompt === 'string' ? config.prompt : '',
    precision: typeof config.precision === 'number' ? String(config.precision) : '',
    format: config.format === 'percent' ? 'percent' : 'plain',
    options: normalizeSelectOptions(column.config),
  };
}

const parsePrecision = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const num = Number(trimmed);
  return Number.isInteger(num) && num >= 0 && num <= 6 ? num : undefined;
};

const numberFormatConfig = (draft: NewColumnDraft): CustomTableColumnConfig => {
  const precision = parsePrecision(draft.precision);
  return {
    ...(precision !== undefined ? { precision } : {}),
    ...(draft.format === 'percent' ? { format: 'percent' as const } : {}),
  };
};

/** Конфиг колонки по типу; остальные поля черновика к этому типу не относятся. */
export function buildColumnConfig(
  draft: NewColumnDraft,
  defaultCurrency: string = DEFAULT_COLUMN_CURRENCY,
): CustomTableColumnConfig | undefined {
  switch (draft.type) {
    // Денежной колонке валюта нужна сразу: без неё в ячейке останется голое число.
    case 'currency':
      return {
        currency: (draft.currency || defaultCurrency).toUpperCase(),
        precision: parsePrecision(draft.precision) ?? 2,
      };
    case 'number': {
      const config = numberFormatConfig(draft);
      return Object.keys(config).length ? config : undefined;
    }
    case 'formula':
      return { expression: draft.expression.trim(), ...numberFormatConfig(draft) };
    case 'relation':
      return { targetTableId: draft.targetTableId };
    case 'ai':
      return { prompt: draft.prompt.trim() };
    case 'select':
    case 'multi_select':
      return { options: normalizeSelectOptions({ options: draft.options }) };
    default:
      return undefined;
  }
}

interface UseColumnManagementMessages {
  addColumnLoading: string;
  addColumnSuccess: string;
  addColumnFailed: string;
  deleteColumnLoading: string;
  deleteColumnSuccess: string;
  deleteColumnFailed: string;
  renameColumnSuccess: string;
  renameColumnFailed: string;
  updateColumnLoading: string;
  updateColumnSuccess: string;
  updateColumnFailed: string;
  columnStyleFailed: string;
}

interface UseColumnManagementParams {
  tableId: string | null;
  /** Валюта воркспейса — стартовое значение для новых денежных колонок. */
  defaultCurrency?: string;
  orderedColumns: CustomTablePageColumn[];
  loadTable: () => Promise<void>;
  /** Точечно обновляет стиль колонки в стейте — без перезагрузки всей таблицы. */
  applyColumnStyle: (opts: { columnKey: string; style: CustomTablePageColumn['style'] }) => void;
  deleteColumnTarget: { id: string } | null;
  closeDeleteColumnModal: () => void;
  messages: UseColumnManagementMessages;
}

export interface UseColumnManagementReturn {
  newColumnOpen: boolean;
  setNewColumnOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newColumn: NewColumnDraft;
  setNewColumn: React.Dispatch<React.SetStateAction<NewColumnDraft>>;
  createColumn: () => Promise<void>;
  updateColumn: (opts: { columnId: string; draft: NewColumnDraft }) => Promise<void>;
  deleteColumn: () => Promise<void>;
  renameColumnTitleFromGrid: (columnKey: string, nextTitle: string) => Promise<void>;
  setColumnStyle: (opts: { columnKey: string; style: ColumnStylePatch }) => Promise<void>;
}

export function useColumnManagement({
  tableId,
  defaultCurrency,
  orderedColumns,
  loadTable,
  applyColumnStyle,
  deleteColumnTarget,
  closeDeleteColumnModal,
  messages,
}: UseColumnManagementParams): UseColumnManagementReturn {
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumn, setNewColumn] = useState<NewColumnDraft>(() =>
    emptyColumnDraft(defaultCurrency),
  );

  const createColumn = useCallback(async () => {
    if (!tableId) {
      return;
    }
    const title = newColumn.title.trim();
    if (!title) {
      return;
    }
    const config = buildColumnConfig(newColumn, defaultCurrency);
    const toastId = toast.loading(messages.addColumnLoading);

    await (async () => {
      await apiClient.post(`/custom-tables/${tableId}/columns`, {
        title,
        type: newColumn.type,
        isRequired: newColumn.isRequired,
        isUnique: newColumn.isUnique,
        ...(config ? { config } : {}),
      });
      toast.success(messages.addColumnSuccess, { id: toastId });
      setNewColumnOpen(false);
      setNewColumn(emptyColumnDraft(defaultCurrency));
      await loadTable();
    })().catch(async error => {
      console.error('Failed to create column:', error);
      toast.error(messages.addColumnFailed, { id: toastId });
    });
  }, [tableId, defaultCurrency, newColumn, loadTable, messages]);

  const updateColumn = useCallback(
    async ({ columnId, draft }: { columnId: string; draft: NewColumnDraft }) => {
      if (!tableId) {
        return;
      }
      const title = draft.title.trim();
      if (!title) {
        return;
      }
      const config = buildColumnConfig(draft, defaultCurrency);
      const toastId = toast.loading(messages.updateColumnLoading);

      await (async () => {
        await apiClient.patch(`/custom-tables/${tableId}/columns/${columnId}`, {
          title,
          type: draft.type,
          isRequired: draft.isRequired,
          isUnique: draft.isUnique,
          ...(config ? { config } : {}),
        });
        toast.success(messages.updateColumnSuccess, { id: toastId });
        await loadTable();
      })().catch(async error => {
        console.error('Failed to update column:', error);
        toast.error(messages.updateColumnFailed, { id: toastId });
        throw error;
      });
    },
    [tableId, defaultCurrency, loadTable, messages],
  );

  const deleteColumn = useCallback(async () => {
    if (!(tableId && deleteColumnTarget)) {
      return;
    }
    const toastId = toast.loading(messages.deleteColumnLoading);

    await (async () => {
      await apiClient.delete(`/custom-tables/${tableId}/columns/${deleteColumnTarget.id}`);
      toast.success(messages.deleteColumnSuccess, { id: toastId });
      closeDeleteColumnModal();
      await loadTable();
    })().catch(async error => {
      console.error('Failed to delete column:', error);
      toast.error(messages.deleteColumnFailed, { id: toastId });
    });
  }, [tableId, deleteColumnTarget, closeDeleteColumnModal, loadTable, messages]);

  const renameColumnTitleFromGrid = useCallback(
    async (columnKey: string, nextTitle: string) => {
      if (!tableId) {
        return;
      }
      const colId = orderedColumns.find(c => c.key === columnKey)?.id;
      if (!colId) {
        return;
      }

      await (async () => {
        await apiClient.patch(`/custom-tables/${tableId}/columns/${colId}`, { title: nextTitle });
        await loadTable();
        toast.success(messages.renameColumnSuccess);
      })().catch(async error => {
        console.error('Failed to rename column:', error);
        toast.error(messages.renameColumnFailed);
      });
    },
    [tableId, orderedColumns, loadTable, messages],
  );

  const setColumnStyle = useCallback(
    async ({ columnKey, style }: { columnKey: string; style: ColumnStylePatch }) => {
      if (!tableId) {
        return;
      }
      const colId = orderedColumns.find(c => c.key === columnKey)?.id;
      if (!colId) {
        return;
      }

      // Перезагрузка таблицы гасит грид индикатором загрузки и закрывает
      // открытое меню, поэтому стиль подставляем из ответа сервера точечно.
      await (async () => {
        const response = await apiClient.patch(
          `/custom-tables/${tableId}/columns/${colId}/style`,
          style,
        );
        const payload = (response.data?.data ?? response.data ?? {}) as {
          style?: CustomTablePageColumn['style'];
        };
        applyColumnStyle({ columnKey, style: payload.style ?? null });
      })().catch(async error => {
        console.error('Failed to save column style:', error);
        toast.error(messages.columnStyleFailed);
      });
    },
    [tableId, orderedColumns, applyColumnStyle, messages],
  );

  return {
    newColumnOpen,
    setNewColumnOpen,
    newColumn,
    setNewColumn,
    createColumn,
    updateColumn,
    deleteColumn,
    renameColumnTitleFromGrid,
    setColumnStyle,
  };
}
