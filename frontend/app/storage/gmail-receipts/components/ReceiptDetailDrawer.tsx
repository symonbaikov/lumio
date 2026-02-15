'use client';

import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import { gmailReceiptsApi } from '@/app/lib/api';
import apiClient from '@/app/lib/api';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import { AlertCircle, ExternalLink, Save, X } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';

interface ReceiptDetailDrawerProps {
  receiptId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface Receipt {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  gmailMessageId: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    tax?: number;
    category?: string;
    categoryId?: string;
    confidence?: number;
    lineItems?: Array<{ description: string; amount: number }>;
  };
  metadata?: {
    snippet?: string;
    attachments?: Array<{ filename: string; size: number }>;
    potentialDuplicates?: string[];
  };
  isDuplicate: boolean;
  duplicateOfId?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  isEnabled?: boolean;
}

const hasReceiptAmount = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return false;
    }
    return Number.isFinite(Number(normalized));
  }

  return false;
};

export function ReceiptDetailDrawer({ receiptId, onClose, onUpdate }: ReceiptDetailDrawerProps) {
  const content = useIntlayer('gmail-receipts-page');
  const [activeTab, setActiveTab] = useState<'overview' | 'parsed' | 'duplicates' | 'history'>(
    'overview',
  );
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<AuditEvent | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    loadReceipt();
    loadCategories();
  }, [receiptId]);

  useEffect(() => {
    if (!receiptId) return;
    setHistoryLoading(true);
    fetchEntityHistory('receipt', receiptId)
      .then(events => setHistoryEvents(events || []))
      .catch(error => {
        console.error('Failed to load receipt history', error);
        setHistoryEvents([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [receiptId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const response = await gmailReceiptsApi.getReceipt(receiptId);
      setReceipt(response.data.receipt);
      setPotentialDuplicates(response.data.potentialDuplicates || []);
      setEditedData(response.data.receipt.parsedData || {});
    } catch (error) {
      console.error('Failed to load receipt', error);
      toast.error(content.toast.error.value);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await gmailReceiptsApi.updateReceiptParsedData(receiptId, editedData);
      toast.success(content.toast.receiptUpdated.value);
      loadReceipt();
      onUpdate();
    } catch (error) {
      console.error('Failed to update receipt', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleMarkDuplicate = async (originalId: string) => {
    try {
      await gmailReceiptsApi.markDuplicate(receiptId, originalId);
      toast.success(content.toast.markedAsDuplicate.value);
      loadReceipt();
      onUpdate();
    } catch (error) {
      console.error('Failed to mark duplicate', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleUnmarkDuplicate = async () => {
    try {
      await gmailReceiptsApi.unmarkDuplicate(receiptId);
      toast.success(content.toast.unmarkedDuplicate.value);
      loadReceipt();
      onUpdate();
    } catch (error) {
      console.error('Failed to unmark duplicate', error);
      toast.error(content.toast.error.value);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="flex h-full w-full items-center justify-center bg-white md:h-[calc(100vh-24px)] md:w-[calc(100vw-24px)] md:rounded-2xl md:shadow-2xl">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  const gmailUrl = `https://mail.google.com/mail/u/0/#all/${receipt.gmailMessageId}`;
  const isMissingAmount = !hasReceiptAmount(editedData.amount ?? receipt.parsedData?.amount);
  const showMissingAmountBanner = receipt.status === 'needs_review' && isMissingAmount;
  const selectedCategoryId = editedData.categoryId || receipt.parsedData?.categoryId || '';
  const selectedCategory = categories.find(category => category.id === selectedCategoryId);
  const hasDisabledCategory = selectedCategory?.isEnabled === false;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        onKeyDown={event => {
          if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close receipt details"
      />
      <div className="fixed inset-0 z-50 p-0 md:p-3">
        <div className="flex h-full w-full flex-col bg-white md:rounded-2xl md:border md:border-[#dbe1dc] md:shadow-[0_24px_64px_rgba(17,24,39,0.24)]">
          {/* Header */}
          <div className="flex items-start justify-between border-b px-4 py-4 sm:px-6">
            <h2 className="pr-4 text-lg font-bold text-gray-900 sm:text-xl">{receipt.subject}</h2>
            <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b px-1 sm:px-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`shrink-0 px-4 py-3 text-sm font-medium sm:px-6 sm:text-base ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {content.drawer.tabs.overview.value}
            </button>
            <button
              onClick={() => setActiveTab('parsed')}
              className={`shrink-0 px-4 py-3 text-sm font-medium sm:px-6 sm:text-base ${
                activeTab === 'parsed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {content.drawer.tabs.parsedData.value}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`shrink-0 px-4 py-3 text-sm font-medium sm:px-6 sm:text-base ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
            {potentialDuplicates.length > 0 && (
              <button
                onClick={() => setActiveTab('duplicates')}
                className={`relative shrink-0 px-4 py-3 text-sm font-medium sm:px-6 sm:text-base ${
                  activeTab === 'duplicates'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {content.drawer.tabs.duplicates.value}
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {potentialDuplicates.length}
                </span>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-[#f8faf8] p-4 sm:p-6">
            <div className="mx-auto w-full max-w-5xl rounded-xl border border-[#e2e8e3] bg-white p-4 shadow-sm sm:p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">
                      {content.drawer.emailPreview.value}
                    </h3>
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">From:</span>
                        <span className="max-w-[70%] break-words text-right text-sm font-medium">
                          {receipt.sender}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date:</span>
                        <span className="text-sm font-medium">
                          {new Date(receipt.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subject:</span>
                        <span className="max-w-[70%] break-words text-right text-sm font-medium">
                          {receipt.subject}
                        </span>
                      </div>
                      {receipt.metadata?.snippet && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-gray-700">{receipt.metadata.snippet}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {receipt.metadata?.attachments && receipt.metadata.attachments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Attachments</h3>
                      <div className="space-y-2">
                        {receipt.metadata.attachments.map(attachment => (
                          <div
                            key={`${attachment.filename}-${attachment.size}`}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="text-sm">{attachment.filename}</span>
                            <button
                              onClick={() => setShowPreview(true)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Preview
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <a
                    href={gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {content.drawer.openInGmail.value}
                  </a>
                </div>
              )}

              {/* Parsed Data Tab */}
              {activeTab === 'parsed' && (
                <div className="space-y-4">
                  {showMissingAmountBanner ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      This receipt is missing required data. Add Amount and save to move it back to
                      draft.
                    </div>
                  ) : null}

                  {receipt.parsedData?.confidence !== undefined && (
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-900">
                        {content.drawer.fields.confidence.value}:{' '}
                        {Math.round(receipt.parsedData.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="receipt-merchant"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {content.drawer.fields.merchant.value}
                    </label>
                    <input
                      id="receipt-merchant"
                      type="text"
                      value={editedData.vendor || ''}
                      onChange={e => setEditedData({ ...editedData, vendor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="receipt-amount"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {content.drawer.fields.amount.value}
                        {showMissingAmountBanner ? (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Required
                          </span>
                        ) : null}
                      </label>
                      <input
                        id="receipt-amount"
                        type="number"
                        value={editedData.amount || ''}
                        onChange={e =>
                          setEditedData({
                            ...editedData,
                            amount:
                              e.target.value.trim() === ''
                                ? undefined
                                : Number.parseFloat(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                          showMissingAmountBanner
                            ? 'border border-amber-300 focus:ring-amber-500'
                            : 'border border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="receipt-currency"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {content.drawer.fields.currency.value}
                      </label>
                      <input
                        id="receipt-currency"
                        type="text"
                        value={editedData.currency || ''}
                        onChange={e => setEditedData({ ...editedData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="receipt-tax"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {content.drawer.fields.tax.value}
                      </label>
                      <input
                        id="receipt-tax"
                        type="number"
                        value={editedData.tax || ''}
                        onChange={e =>
                          setEditedData({
                            ...editedData,
                            tax:
                              e.target.value.trim() === ''
                                ? undefined
                                : Number.parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="receipt-date"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {content.drawer.fields.date.value}
                      </label>
                      <input
                        id="receipt-date"
                        type="date"
                        value={editedData.date || ''}
                        onChange={e => setEditedData({ ...editedData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="receipt-category"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {content.drawer.fields.category.value}
                    </label>
                    {hasDisabledCategory ? (
                      <p className="mb-2 text-sm font-medium text-red-600">
                        {selectedCategory?.name} - category disabled, choose another
                      </p>
                    ) : null}
                    <select
                      id="receipt-category"
                      value={editedData.categoryId || ''}
                      onChange={e => {
                        const selectedCategory = categories.find(c => c.id === e.target.value);
                        setEditedData({
                          ...editedData,
                          categoryId: e.target.value,
                          category: selectedCategory?.name || '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter(cat => cat.isEnabled !== false)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {receipt.parsedData?.lineItems && receipt.parsedData.lineItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Line Items</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Description</th>
                              <th className="px-4 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {receipt.parsedData.lineItems.map(item => (
                              <tr key={`${item.description}-${item.amount}`}>
                                <td className="px-4 py-2">{item.description}</td>
                                <td className="px-4 py-2 text-right">
                                  {item.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSaveChanges}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {content.drawer.fields.saveChanges.value}
                  </button>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {historyLoading ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
                      Loading history...
                    </div>
                  ) : (
                    <EntityHistoryTimeline
                      events={historyEvents}
                      onSelect={event => {
                        setSelectedHistoryEvent(event);
                        setHistoryDrawerOpen(true);
                      }}
                    />
                  )}
                </div>
              )}

              {/* Duplicates Tab */}
              {activeTab === 'duplicates' && (
                <div className="space-y-4">
                  {potentialDuplicates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {content.drawer.duplicates.noDuplicates.value}
                    </div>
                  ) : (
                    <>
                      <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-900">
                          Found {potentialDuplicates.length} potential duplicate(s). Review and mark
                          if they are duplicates.
                        </div>
                      </div>

                      {potentialDuplicates.map(duplicate => (
                        <div key={duplicate.id} className="border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <span className="ml-2 font-medium">
                                {new Date(
                                  duplicate.parsedData?.date || duplicate.receivedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <span className="ml-2 font-medium">
                                {duplicate.parsedData?.amount?.toLocaleString()}{' '}
                                {duplicate.parsedData?.currency || 'KZT'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600">Merchant:</span>
                              <span className="ml-2 font-medium">
                                {duplicate.parsedData?.vendor || duplicate.sender}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMarkDuplicate(duplicate.id)}
                              className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                            >
                              {content.drawer.duplicates.markAsDuplicate.value}
                            </button>
                            <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                              {content.drawer.duplicates.notDuplicate.value}
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {receipt.isDuplicate && receipt.duplicateOfId && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-red-900 mb-2">
                        This receipt is marked as a duplicate.
                      </p>
                      <button
                        onClick={handleUnmarkDuplicate}
                        className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm"
                      >
                        Unmark as Duplicate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />

      {/* Preview Modal */}
      {showPreview && (
        <ReceiptPreviewModal receiptId={receiptId} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}
