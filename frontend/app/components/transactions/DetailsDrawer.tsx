'use client';

import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import { useIntlayer, useLocale } from '@/app/i18n';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import { Building2, Calendar, FileText, Tag, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DrawerShell } from '../ui/drawer-shell';
import type { Category, Transaction } from './types';

interface DetailsDrawerProps {
  open: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onUpdateCategory?: (txId: string, categoryId: string) => Promise<void>;
  onMarkIgnored?: (txId: string) => Promise<void>;
}

/**
 * Drawer component for displaying full transaction details and actions
 */
export default function DetailsDrawer({
  open,
  transaction,
  categories,
  onClose,
  onUpdateCategory,
  onMarkIgnored,
}: DetailsDrawerProps) {
  const { locale } = useLocale();
  const t = useIntlayer('transactionsDrawer');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<AuditEvent | null>(null);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  };

  const formatAmount = (amount: number, currency?: string): string => {
    return new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: currency || 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategoryId || !onUpdateCategory || !transaction) return;
    try {
      setUpdating(true);
      await onUpdateCategory(transaction.id, selectedCategoryId);
      setSelectedCategoryId('');
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkIgnored = async () => {
    if (!onMarkIgnored || !transaction) return;
    try {
      await onMarkIgnored(transaction.id);
    } catch (error) {
      console.error('Failed to mark as ignored:', error);
    }
  };

  useEffect(() => {
    if (!open || !transaction) return;
    setHistoryLoading(true);
    fetchEntityHistory('transaction', transaction.id)
      .then(events => {
        setHistoryEvents(events || []);
      })
      .catch(error => {
        console.error('Failed to load history:', error);
        setHistoryEvents([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [open, transaction?.id]);

  if (!transaction) return null;

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      title={t.title.value}
      position="right"
      width="md"
      lockScroll={false}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-none px-3 py-1 ${
              activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`rounded-none px-3 py-1 ${
              activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-6">
            {/* Date and Document */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-none bg-gray-100 p-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t.date.value}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {formatDate(transaction.transactionDate)}
                  </div>
                </div>
              </div>

              {transaction.documentNumber && (
                <div className="flex items-start gap-3">
                  <div className="rounded-none bg-gray-100 p-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t.documentNumber.value}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {transaction.documentNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Counterparty */}
            <div className="rounded-none border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-none bg-white p-2 border border-gray-100">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t.counterparty.value}
                  </div>
                  <div className="mt-1 text-sm font-bold text-gray-900">
                    {transaction.counterpartyName}
                  </div>
                  {transaction.counterpartyBin && (
                    <div className="mt-1 text-xs text-gray-600">
                      {t.bin.value}: {transaction.counterpartyBin}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Purpose */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t.purpose.value}
              </div>
              <div className="mt-2 rounded-none border border-gray-200 bg-gray-50/60 p-3 text-sm text-gray-900">
                {transaction.paymentPurpose || '—'}
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-none border border-red-200 bg-red-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                  <TrendingDown className="h-4 w-4" />
                  {t.debit.value}
                </div>
                <div className="mt-2 text-lg font-semibold text-red-700">
                  {transaction.debit > 0
                    ? formatAmount(transaction.debit, transaction.currency)
                    : '—'}
                </div>
              </div>

              <div className="rounded-none border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                  {t.credit.value}
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-700">
                  {transaction.credit > 0
                    ? formatAmount(transaction.credit, transaction.currency)
                    : '—'}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-2 rounded-none border border-gray-200 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                {t.additionalDetails.value}
              </div>

              {transaction.currency && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.currency.value}:</span>
                  <span className="font-semibold text-gray-900">{transaction.currency}</span>
                </div>
              )}

              {transaction.exchangeRate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.exchangeRate.value}:</span>
                  <span className="font-semibold text-gray-900">
                    {transaction.exchangeRate.toFixed(4)}
                  </span>
                </div>
              )}

              {transaction.article && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.article.value}:</span>
                  <span className="font-semibold text-gray-900">{transaction.article}</span>
                </div>
              )}

              {transaction.branch?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.branch.value}:</span>
                  <span className="font-semibold text-gray-900">{transaction.branch.name}</span>
                </div>
              )}

              {transaction.wallet?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.wallet.value}:</span>
                  <span className="font-semibold text-gray-900">{transaction.wallet.name}</span>
                </div>
              )}
            </div>

            {/* Parsing Metadata */}
            {(transaction.parsingConfidence || transaction.rawExtract) && (
              <div className="space-y-2 rounded-none border border-blue-200 bg-blue-50/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {t.parsingMetadata.value}
                </div>

                {transaction.parsingConfidence && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">{t.confidence.value}:</span>
                    <span className="font-semibold text-blue-900">
                      {(transaction.parsingConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                {transaction.rawExtract && (
                  <div className="mt-2">
                    <span className="text-xs text-blue-600">{t.rawExtract.value}:</span>
                    <div className="mt-1 max-h-20 overflow-y-auto rounded bg-blue-100/80 p-2 font-mono text-xs text-blue-900">
                      {transaction.rawExtract}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Category */}
            <div className="rounded-none border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                <Tag className="h-4 w-4" />
                {t.currentCategory.value}
              </div>
              <div className="mt-2">
                {transaction.category ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-none px-3 py-1.5 text-sm font-semibold"
                    style={{
                      backgroundColor:
                        transaction.category.isEnabled === false
                          ? '#fee2e2'
                          : transaction.category.color
                            ? `${transaction.category.color}15`
                            : '#e5e7eb',
                      color:
                        transaction.category.isEnabled === false
                          ? '#b91c1c'
                          : transaction.category.color || '#374151',
                    }}
                  >
                    {transaction.category.isEnabled === false
                      ? `${transaction.category.name} — select category`
                      : transaction.category.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">{t.noCategory.value}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 border-t border-gray-200 pt-6">
              <div className="text-sm font-semibold text-gray-900">{t.actions.value}</div>

              {/* Set Category */}
              {onUpdateCategory && (
                <div className="space-y-2">
                  <label
                    htmlFor="category-select"
                    className="block text-xs font-semibold text-gray-700"
                  >
                    {t.setCategory.value}
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="category-select"
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      className="flex-1 rounded-none border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">{t.selectCategory.value}</option>
                      {categories
                        .filter(cat => cat.isEnabled !== false)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleUpdateCategory}
                      disabled={!selectedCategoryId || updating}
                      className="rounded-none bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updating ? t.updating.value : t.apply.value}
                    </button>
                  </div>
                </div>
              )}

              {/* Mark as Ignored */}
              {onMarkIgnored && (
                <button
                  type="button"
                  onClick={handleMarkIgnored}
                  className="w-full rounded-none border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
                >
                  {t.markIgnored.value}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="rounded-none border border-gray-200 bg-white p-4 text-sm text-gray-500">
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
      </div>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />
    </DrawerShell>
  );
}
