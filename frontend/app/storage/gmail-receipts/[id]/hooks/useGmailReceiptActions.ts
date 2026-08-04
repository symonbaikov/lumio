'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { gmailReceiptsApi } from '@/app/lib/api';
import { resolveCurrencyCode } from '@/app/lib/format-money';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { parseAmountValue } from './useGmailReceiptData';
import type {
  EditableReceiptData,
  GmailReceipt,
  ReceiptCategoryOption,
} from './useGmailReceiptData';

export interface UseGmailReceiptActionsProps {
  receiptId: string;
  receipt: GmailReceipt | null;
  editedData: EditableReceiptData;
  categories: ReceiptCategoryOption[];
  setReceipt: React.Dispatch<React.SetStateAction<GmailReceipt | null>>;
  setPotentialDuplicates: React.Dispatch<React.SetStateAction<GmailReceipt[]>>;
  setEditedData: React.Dispatch<React.SetStateAction<EditableReceiptData>>;
}

export interface UseGmailReceiptActionsReturn {
  saving: boolean;
  submitting: boolean;
  exporting: boolean;
  categorySaving: boolean;
  payableDrawerOpen: boolean;
  setPayableDrawerOpen: (open: boolean) => void;
  categoryDrawerOpen: boolean;
  setCategoryDrawerOpen: (open: boolean) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  handleSaveChanges: () => Promise<void>;
  handleSubmitDocument: () => Promise<void>;
  handleCategorySelect: (categoryId: string) => Promise<void>;
  handleExportToGmailDraft: () => Promise<void>;
  handleExportToSheets: () => Promise<void>;
  handleMarkDuplicate: (originalId: string) => Promise<void>;
  handleUnmarkDuplicate: () => Promise<void>;
  handleCreatePayable: () => Promise<void>;
}

export function useGmailReceiptActions({
  receiptId,
  receipt,
  editedData,
  categories,
  setReceipt,
  setPotentialDuplicates,
  setEditedData,
}: UseGmailReceiptActionsProps): UseGmailReceiptActionsReturn {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [payableDrawerOpen, setPayableDrawerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const refreshReceipt = async (): Promise<void> => {
    const response = await gmailReceiptsApi.getReceipt(receiptId);
    setReceipt(response.data.receipt);
    setPotentialDuplicates(response.data.potentialDuplicates || []);
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      setSaving(true);
      const normalizedLineItems = editedData.lineItems
        .filter(item => Number.isFinite(item.amount))
        .map(item => ({ description: item.description, amount: item.amount }));
      const lineItemsTotal = normalizedLineItems.reduce((sum, item) => sum + item.amount, 0);

      await gmailReceiptsApi.updateReceiptParsedData(receiptId, {
        ...editedData,
        amount: normalizedLineItems.length > 0 ? lineItemsTotal : editedData.amount,
        lineItems: normalizedLineItems,
      });
      toast.success('Receipt updated');
      await refreshReceipt();
    } catch (error) {
      console.error('Failed to save receipt changes', error);
      toast.error('Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitDocument = async (): Promise<void> => {
    if (!receipt) {
      return;
    }
    const amount = parseAmountValue(editedData.amount ?? receipt.parsedData?.amount ?? null);
    if (amount === null || amount <= 0) {
      toast.error('Amount is required before submit');
      return;
    }
    try {
      setSubmitting(true);
      await gmailReceiptsApi.approveReceipt(receipt.id, {
        description: editedData.vendor || receipt.parsedData?.vendor || receipt.subject,
        amount,
        currency: editedData.currency || receipt.parsedData?.currency || workspaceCurrency,
        date: editedData.date || receipt.parsedData?.date || receipt.receivedAt,
      });
      toast.success('Receipt submitted');
      await refreshReceipt();
    } catch (error) {
      console.error('Failed to submit receipt', error);
      toast.error('Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategorySelect = async (categoryId: string): Promise<void> => {
    if (!receipt || categorySaving) {
      return;
    }

    const selected = categories.find(c => c.id === categoryId);

    try {
      setCategorySaving(true);
      await gmailReceiptsApi.updateReceiptParsedData(receipt.id, {
        categoryId: categoryId || null,
        category: selected?.name || null,
      });

      setEditedData(prev => ({
        ...prev,
        categoryId: categoryId || undefined,
        category: selected?.name,
      }));

      setReceipt(prev =>
        prev
          ? {
              ...prev,
              parsedData: {
                ...prev.parsedData,
                categoryId: categoryId || undefined,
                category: selected?.name,
              },
            }
          : prev,
      );

      setCategoryDrawerOpen(false);
      toast.success('Category updated');
    } catch (error) {
      console.error('Failed to update category', error);
      toast.error('Failed to update category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleExportToGmailDraft = async (): Promise<void> => {
    try {
      setExporting(true);
      const response = await gmailReceiptsApi.exportReceiptToDraft(receiptId);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      }
      toast.success('Gmail draft created');
    } catch (error) {
      console.error('Failed to create Gmail draft', error);
      toast.error('Failed to create Gmail draft');
    } finally {
      setExporting(false);
    }
  };

  const handleExportToSheets = async (): Promise<void> => {
    try {
      setExporting(true);
      const response = await gmailReceiptsApi.exportReceiptsToSheets([receiptId]);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
      toast.success('Receipt exported to Sheets');
    } catch (error) {
      console.error('Failed to export receipt', error);
      toast.error('Failed to export receipt');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkDuplicate = async (originalId: string): Promise<void> => {
    try {
      await gmailReceiptsApi.markDuplicate(receiptId, originalId);
      toast.success('Marked as duplicate');
      await refreshReceipt();
    } catch (error) {
      console.error('Failed to mark duplicate', error);
      toast.error('Failed to mark duplicate');
    }
  };

  const handleUnmarkDuplicate = async (): Promise<void> => {
    try {
      await gmailReceiptsApi.unmarkDuplicate(receiptId);
      toast.success('Duplicate mark removed');
      await refreshReceipt();
    } catch (error) {
      console.error('Failed to unmark duplicate', error);
      toast.error('Failed to unmark duplicate');
    }
  };

  const handleCreatePayable = async (): Promise<void> => {
    toast.success('Payable draft is ready to save');
    router.push('/statements/pay');
  };

  return {
    saving,
    submitting,
    exporting,
    categorySaving,
    payableDrawerOpen,
    setPayableDrawerOpen,
    categoryDrawerOpen,
    setCategoryDrawerOpen,
    showPreview,
    setShowPreview,
    handleSaveChanges,
    handleSubmitDocument,
    handleCategorySelect,
    handleExportToGmailDraft,
    handleExportToSheets,
    handleMarkDuplicate,
    handleUnmarkDuplicate,
    handleCreatePayable,
  };
}
