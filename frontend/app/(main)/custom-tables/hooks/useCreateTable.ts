'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { resolveCurrencyCode } from '@/app/lib/format-money';
import {
  applyTemplate,
  buildTemplateColumnPayloads,
  TABLE_TEMPLATES,
  type TableTemplateId,
} from '../templates';

export interface CreateTableForm {
  name: string;
  description: string;
  categoryId: string;
  templateId: TableTemplateId | null;
}

const EMPTY_FORM: CreateTableForm = { name: '', description: '', categoryId: '', templateId: null };

interface UseCreateTableParams {
  /** Translated column titles per template column key. */
  columnTitles: Record<string, string>;
  messages: { created: string; createFailed: string; applying: string; partialFailed: string };
}

/** "New table" dialog: creates the table, then applies the template columns one by one. */
export function useCreateTable({ columnTitles, messages }: UseCreateTableParams) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTableForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setForm(EMPTY_FORM);
  }, []);

  const submit = useCallback(async () => {
    const name = form.name.trim();
    if (!name || creating) {
      return;
    }
    setCreating(true);
    const template = TABLE_TEMPLATES.find(item => item.id === form.templateId) ?? null;
    await (async () => {
      const response = await apiClient.post('/custom-tables', {
        name,
        description: form.description.trim() || undefined,
        categoryId: form.categoryId || undefined,
      });
      const created = (response.data?.data ?? response.data) as { id?: string } | null;
      if (created?.id && template) {
        const toastId = toast.loading(messages.applying);
        const { failed } = await applyTemplate({
          tableId: created.id,
          payloads: buildTemplateColumnPayloads(template, {
            titles: columnTitles,
            currency: resolveCurrencyCode(currentWorkspace?.currency),
          }),
          post: async (url, body) => {
            const columnResponse = await apiClient.post(url, body);
            return columnResponse.data?.data ?? columnResponse.data ?? null;
          },
        });
        if (failed.length) {
          toast.error(messages.partialFailed, { id: toastId });
        } else {
          toast.success(messages.created, { id: toastId });
        }
      } else {
        toast.success(messages.created);
      }
      close();
      if (created?.id) {
        router.push(`/custom-tables/${created.id}`);
      }
    })()
      .catch(async error => {
        console.error('Failed to create table:', error);
        toast.error(getApiErrorMessage(error, messages.createFailed));
      })
      .finally(async () => {
        setCreating(false);
      });
  }, [form, creating, columnTitles, currentWorkspace?.currency, messages, router, close]);

  return { open, setOpen, form, setForm, creating, close, submit };
}
