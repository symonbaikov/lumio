'use client';

import type {
  EditableReceiptLineItem,
  EditableReceiptParsedData,
  ReceiptCategoryOption,
} from '@/app/components/receipts/receipt-types';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient, { apiBaseUrl, receiptsApi, type ReceiptRecord } from '@/app/lib/api';
import { normalizeReceiptLineItems } from '@/app/lib/financial-document';
import { resolveCurrencyCode } from '@/app/lib/format-money';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

function buildLineItems(receipt: ReceiptRecord | null): EditableReceiptLineItem[] {
  return normalizeReceiptLineItems(receipt?.parsedData).map((item, index) => ({
    id: `line-${index + 1}`,
    description: item.description,
    amount: item.amount,
  }));
}

function extractParsedFields(
  receipt: ReceiptRecord | null,
  fallbackCurrency: string,
): Omit<EditableReceiptParsedData, 'lineItems'> {
  if (!receipt?.parsedData) {
    return {
      vendor: '',
      amount: '',
      currency: fallbackCurrency,
      date: '',
      tax: '',
      paymentMethod: '',
      transactionType: 'expense',
      categoryId: '',
    };
  }
  const pd = receipt.parsedData;
  return {
    vendor: pd.vendor ?? '',
    amount: pd.amount ?? '',
    currency: pd.currency ?? fallbackCurrency,
    date: pd.date ? pd.date.split('T')[0] : '',
    tax: pd.tax ?? '',
    paymentMethod: pd.paymentMethod ?? '',
    transactionType: pd.transactionType ?? 'expense',
    categoryId: pd.categoryId ?? '',
  };
}

function buildInitialForm(
  receipt: ReceiptRecord | null,
  fallbackCurrency: string,
): EditableReceiptParsedData {
  return {
    ...extractParsedFields(receipt, fallbackCurrency),
    lineItems: buildLineItems(receipt),
  };
}

export function buildParsedDataPayload(
  formValue: EditableReceiptParsedData,
): Record<string, unknown> {
  const lineItems = formValue.lineItems
    .filter(item => item.description.trim().length > 0 || Number.isFinite(item.amount))
    .map(item => ({ description: item.description, amount: item.amount }));

  return {
    vendor: formValue.vendor,
    amount: formValue.amount === '' ? undefined : Number(formValue.amount),
    currency: formValue.currency,
    date: formValue.date,
    tax: formValue.tax === '' ? undefined : Number(formValue.tax),
    paymentMethod: formValue.paymentMethod,
    transactionType: formValue.transactionType,
    categoryId: formValue.categoryId || undefined,
    lineItems,
  };
}

export interface UseReceiptDataReturn {
  receipt: ReceiptRecord | null;
  categories: ReceiptCategoryOption[];
  formValue: EditableReceiptParsedData;
  setFormValue: (v: EditableReceiptParsedData) => void;
  loading: boolean;
  saving: boolean;
  previewLoading: boolean;
  previewUrl: string | null;
  previewMimeType: string | null;
  previewError: string | null;
  error: string | null;
  loadData: () => Promise<void>;
  handleFormChange: (nextValue: EditableReceiptParsedData) => void;
  handleApprove: () => Promise<void>;
  handleDownload: () => Promise<void>;
}

interface FetchFileResult {
  blob: Blob;
  mimeType: string;
}

async function fetchReceiptFile(receiptId: string): Promise<FetchFileResult> {
  const response = await fetch(`${apiBaseUrl}/receipts/${receiptId}/file`, {
    method: 'GET',
    headers: getWorkspaceHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const blob = await response.blob();
  return { blob, mimeType: response.headers.get('content-type') || blob.type || '' };
}

type UrlSetter = React.Dispatch<React.SetStateAction<string | null>>;

function revokeAndSet(setter: UrlSetter, nextUrl: string | null): void {
  setter(current => {
    if (current) {
      URL.revokeObjectURL(current);
    }
    return nextUrl;
  });
}

interface PreviewSetters {
  setPreviewLoading: (v: boolean) => void;
  setPreviewUrl: UrlSetter;
  setPreviewMimeType: (v: string | null) => void;
  setPreviewError: (v: string | null) => void;
}

async function loadPreviewAsync(
  receiptId: string,
  active: { value: boolean },
  setters: PreviewSetters,
): Promise<string | null> {
  setters.setPreviewLoading(true);
  setters.setPreviewError(null);
  let objectUrl: string | null = null;
  try {
    const { blob, mimeType } = await fetchReceiptFile(receiptId);
    objectUrl = URL.createObjectURL(blob);
    if (active.value) {
      revokeAndSet(setters.setPreviewUrl, objectUrl);
      setters.setPreviewMimeType(mimeType);
    }
  } catch (err) {
    console.error('Failed to load receipt preview:', err);
    if (active.value) {
      setters.setPreviewError('Preview unavailable');
      revokeAndSet(setters.setPreviewUrl, null);
      setters.setPreviewMimeType(null);
    }
  } finally {
    if (active.value) {
      setters.setPreviewLoading(false);
    }
  }
  return objectUrl;
}

function usePreviewLoader(receipt: ReceiptRecord | null, setters: PreviewSetters): void {
  useEffect(() => {
    if (!receipt) {
      revokeAndSet(setters.setPreviewUrl, null);
      setters.setPreviewMimeType(null);
      setters.setPreviewError(null);
      setters.setPreviewLoading(false);
      return;
    }
    const active = { value: true };
    let objectUrl: string | null = null;
    void loadPreviewAsync(receipt.id, active, setters).then(url => {
      objectUrl = url;
    });
    return () => {
      active.value = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);
}

function extractApiData(
  receiptRes: { data: unknown },
  categoriesRes: { data: unknown },
): { receipt: ReceiptRecord; categories: ReceiptCategoryOption[] } {
  const rd = receiptRes.data as Record<string, unknown>;
  const cd = categoriesRes.data as Record<string, unknown>;
  return {
    receipt: (rd.data || rd) as ReceiptRecord,
    categories: (cd.data || cd || []) as ReceiptCategoryOption[],
  };
}

function useLoadData(
  receiptId: string,
  fallbackCurrency: string,
  setters: {
    setReceipt: (v: ReceiptRecord) => void;
    setFormValue: (v: EditableReceiptParsedData) => void;
    setCategories: (v: ReceiptCategoryOption[]) => void;
    setLoading: (v: boolean) => void;
    setError: (v: string | null) => void;
  },
): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    setters.setLoading(true);
    setters.setError(null);
    try {
      const [rr, cr] = await Promise.all([
        apiClient.get(`/receipts/${receiptId}`),
        apiClient.get('/categories'),
      ]);
      const { receipt, categories } = extractApiData(rr, cr);
      setters.setReceipt(receipt);
      setters.setFormValue(buildInitialForm(receipt, fallbackCurrency));
      setters.setCategories(categories);
    } catch (err) {
      console.error('Failed to load receipt details:', err);
      setters.setError('Failed to load receipt');
      toast.error('Failed to load receipt');
    } finally {
      setters.setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId, fallbackCurrency]);
}

function usePersistParsedData(
  receipt: ReceiptRecord | null,
  setReceipt: React.Dispatch<React.SetStateAction<ReceiptRecord | null>>,
  lastSavedRef: React.MutableRefObject<string | null>,
): (nextValue: EditableReceiptParsedData) => Promise<void> {
  return useCallback(
    async (nextValue: EditableReceiptParsedData): Promise<void> => {
      if (!receipt) {
        return;
      }
      const nextPayload = buildParsedDataPayload(nextValue);
      const serialized = JSON.stringify(nextPayload);
      if (serialized === lastSavedRef.current) {
        return;
      }
      try {
        await apiClient.patch(`/receipts/${receipt.id}`, { parsedData: nextPayload });
        lastSavedRef.current = serialized;
        setReceipt(cur =>
          cur ? { ...cur, parsedData: { ...cur.parsedData, ...nextPayload } } : cur,
        );
      } catch {
        toast.error('Failed to autosave receipt changes.');
      }
    },
    [receipt, setReceipt, lastSavedRef],
  );
}

function useApproveReceipt(
  receipt: ReceiptRecord | null,
  formValue: EditableReceiptParsedData,
  loadData: () => Promise<void>,
  lastSavedRef: React.MutableRefObject<string | null>,
): { saving: boolean; handleApprove: () => Promise<void> } {
  const [saving, setSaving] = useState(false);
  const handleApprove = async (): Promise<void> => {
    if (!receipt) {
      return;
    }
    setSaving(true);
    try {
      const payload = buildParsedDataPayload(formValue);
      await apiClient.patch(`/receipts/${receipt.id}`, { parsedData: payload });
      lastSavedRef.current = JSON.stringify(payload);
      await receiptsApi.approveReceipt(receipt.id);
      toast.success('Receipt approved.');
      await loadData();
    } catch {
      toast.error('Failed to approve receipt.');
    } finally {
      setSaving(false);
    }
  };
  return { saving, handleApprove };
}

export function useReceiptData({ receiptId }: { receiptId: string }): UseReceiptDataReturn {
  const { currentWorkspace } = useWorkspace();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [categories, setCategories] = useState<ReceiptCategoryOption[]>([]);
  const [formValue, setFormValue] = useState<EditableReceiptParsedData>(() =>
    buildInitialForm(null, workspaceCurrency),
  );
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useLoadData(receiptId, workspaceCurrency, {
    setReceipt: r => setReceipt(r),
    setFormValue,
    setCategories,
    setLoading,
    setError,
  });
  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    if (!receipt) {
      lastSavedRef.current = null;
      return;
    }
    lastSavedRef.current = JSON.stringify(
      buildParsedDataPayload(buildInitialForm(receipt, workspaceCurrency)),
    );
  }, [receipt, workspaceCurrency]);
  useEffect(
    () => () => {
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
      }
    },
    [],
  );
  usePreviewLoader(receipt, {
    setPreviewLoading,
    setPreviewUrl,
    setPreviewMimeType,
    setPreviewError,
  });

  const persistParsedData = usePersistParsedData(receipt, setReceipt, lastSavedRef);
  const { saving, handleApprove } = useApproveReceipt(receipt, formValue, loadData, lastSavedRef);

  const handleFormChange = useCallback(
    (nextValue: EditableReceiptParsedData): void => {
      setFormValue(nextValue);
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
      }
      autosaveRef.current = setTimeout(() => void persistParsedData(nextValue), 250);
    },
    [persistParsedData],
  );

  const handleDownload = async (): Promise<void> => {
    if (!receipt) {
      return;
    }
    try {
      const { blob } = await fetchReceiptFile(receipt.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = receipt.metadata?.attachments?.[0]?.filename || receipt.subject || receipt.id;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast.error('Failed to download receipt');
    }
  };

  return {
    receipt,
    categories,
    formValue,
    setFormValue,
    loading,
    saving,
    previewLoading,
    previewUrl,
    previewMimeType,
    previewError,
    error,
    loadData,
    handleFormChange,
    handleApprove,
    handleDownload,
  };
}
