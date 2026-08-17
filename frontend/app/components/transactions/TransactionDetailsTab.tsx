/* eslint-disable max-lines */
'use client';

import {
  Building2,
  Calendar,
  FileText,
  Tag,
  TrendingDown,
  TrendingUp,
} from '@/app/components/icons';
import { useCallback, useState } from 'react';

import { useCurrencyDisplay } from '@/app/contexts/CurrencyDisplayContext';
import { useIntlayer, useLocale } from '@/app/i18n';

import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import { SplitTransactionDialog } from './SplitTransactionDialog';
import { formatAmount, formatDate } from './helpers/transactionFormatters';
import { useTransactionSplit } from './hooks/useTransactionSplit';
import type { Category, Transaction } from './types';

interface TransactionDetailsTabProps {
  transaction: Transaction;
  categories: Category[];
  // eslint-disable-next-line max-params
  onUpdateCategory?: (txId: string, categoryId: string) => Promise<void>;
  onMarkIgnored?: (txId: string) => Promise<void>;
  /** Refreshes the transaction list (and closes the drawer) after a split/unsplit. */
  onSplitDone?: () => void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export function TransactionDetailsTab({
  transaction,
  categories,
  onUpdateCategory,
  onMarkIgnored,
  onSplitDone,
}: TransactionDetailsTabProps) {
  const { locale } = useLocale();
  const t = useIntlayer('transactionsDrawer');
  const { showConverted } = useCurrencyDisplay();
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  // The list refresh (and drawer close) is owned by the container — a split turns
  // one row into several, so the drawer must not keep showing the stale original.
  const handleSplitDone = useCallback(async () => {
    setSplitOpen(false);
    await onSplitDone?.();
  }, [onSplitDone]);
  const { split, unsplit, saving: splitSaving } = useTransactionSplit(handleSplitDone);

  // The pre-split total the backend validates against: the positive side of the
  // row, not `transaction.amount`, which the mappers sign for display.
  const splitTotal = transaction.debit > 0 ? Number(transaction.debit) : Number(transaction.credit);
  const splitCategories = categories.filter(cat => cat.isEnabled !== false);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleUpdateCategory = async () => {
    if (!selectedCategoryId || !onUpdateCategory) return;
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleMarkIgnored = async () => {
    if (!onMarkIgnored) return;
    try {
      await onMarkIgnored(transaction.id);
    } catch (error) {
      console.error('Failed to mark as ignored:', error);
    }
  };

  return (
    <div className="lumio-tx-detail">
      {/* Date and Document */}
      <div className="lumio-tx-detail__section">
        <div className="lumio-tx-detail__icon-row">
          <div className="lumio-tx-detail__icon">
            <Calendar size={20} color={c.ink700} />
          </div>
          <div className="lumio-tx-detail__field">
            <div className="lumio-tx-detail__label">{t.date.value}</div>
            <div className="lumio-tx-detail__value">
              {formatDate(transaction.transactionDate, locale)}
            </div>
          </div>
        </div>

        {transaction.documentNumber && (
          <div className="lumio-tx-detail__icon-row">
            <div className="lumio-tx-detail__icon">
              <FileText size={20} color={c.ink700} />
            </div>
            <div className="lumio-tx-detail__field">
              <div className="lumio-tx-detail__label">{t.documentNumber.value}</div>
              <div className="lumio-tx-detail__value">{transaction.documentNumber}</div>
            </div>
          </div>
        )}
      </div>

      {/* Counterparty */}
      <div className="lumio-tx-detail__card">
        <div className="lumio-tx-detail__icon-row">
          <div className="lumio-tx-detail__icon--white">
            <Building2 size={20} color={c.ink700} />
          </div>
          <div className="lumio-tx-detail__field">
            <div className="lumio-tx-detail__label">{t.counterparty.value}</div>
            <div className="lumio-tx-detail__value" style={{ fontWeight: 700 }}>
              {transaction.counterpartyName}
            </div>
            {transaction.counterpartyBin && (
              <div style={{ marginTop: 4, fontSize: 12, color: c.ink700 }}>
                {t.bin.value}: {transaction.counterpartyBin}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Purpose */}
      <div>
        <div className="lumio-tx-detail__label">{t.purpose.value}</div>
        <div
          className="lumio-tx-detail__card"
          style={{ marginTop: 8, fontSize: 14, color: c.ink900 }}
        >
          {transaction.paymentPurpose || '—'}
        </div>
      </div>

      {/* Amounts */}
      <div className="lumio-tx-detail__amount-grid">
        <div className="lumio-tx-detail__amount-card lumio-tx-detail__amount-card--debit">
          <div className="lumio-tx-detail__amount-label lumio-tx-detail__amount-label--debit">
            <TrendingDown size={16} />
            {t.debit.value}
          </div>
          <div className="lumio-tx-detail__amount-value lumio-tx-detail__amount-value--debit">
            {transaction.debit > 0 ? (
              <>
                {showConverted && transaction.convertedAmount !== undefined
                  ? formatAmount(
                      transaction.convertedAmount,
                      transaction.convertedCurrency ?? 'KZT',
                      locale,
                    )
                  : formatAmount(transaction.debit, transaction.currency ?? 'KZT', locale)}
                {showConverted && transaction.convertedAmount !== undefined && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--color-error-soft-border)',
                    }}
                  >
                    {formatAmount(transaction.debit, transaction.currency ?? 'KZT', locale)}
                  </div>
                )}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>

        <div className="lumio-tx-detail__amount-card lumio-tx-detail__amount-card--credit">
          <div className="lumio-tx-detail__amount-label lumio-tx-detail__amount-label--credit">
            <TrendingUp size={16} />
            {t.credit.value}
          </div>
          <div className="lumio-tx-detail__amount-value lumio-tx-detail__amount-value--credit">
            {transaction.credit > 0 ? (
              <>
                {showConverted && transaction.convertedAmount !== undefined
                  ? formatAmount(
                      transaction.convertedAmount,
                      transaction.convertedCurrency ?? 'KZT',
                      locale,
                    )
                  : formatAmount(transaction.credit, transaction.currency ?? 'KZT', locale)}
                {showConverted && transaction.convertedAmount !== undefined && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--color-success-soft-border)',
                    }}
                  >
                    {formatAmount(transaction.credit, transaction.currency ?? 'KZT', locale)}
                  </div>
                )}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="lumio-tx-detail__card">
        <div className="lumio-tx-detail__label" style={{ color: c.ink800, marginBottom: 8 }}>
          {t.additionalDetails.value}
        </div>

        {transaction.currency && (
          <div className="lumio-tx-detail__row">
            <span style={{ color: c.ink700 }}>{t.currency.value}:</span>
            <span style={{ fontWeight: 600, color: c.ink900 }}>{transaction.currency}</span>
          </div>
        )}

        {transaction.exchangeRate && (
          <div className="lumio-tx-detail__row">
            <span style={{ color: c.ink700 }}>{t.exchangeRate.value}:</span>
            <span style={{ fontWeight: 600, color: c.ink900 }}>
              {transaction.exchangeRate.toFixed(4)}
            </span>
          </div>
        )}

        {transaction.article && (
          <div className="lumio-tx-detail__row">
            <span style={{ color: c.ink700 }}>{t.article.value}:</span>
            <span style={{ fontWeight: 600, color: c.ink900 }}>{transaction.article}</span>
          </div>
        )}

        {transaction.branch?.name && (
          <div className="lumio-tx-detail__row">
            <span style={{ color: c.ink700 }}>{t.branch.value}:</span>
            <span style={{ fontWeight: 600, color: c.ink900 }}>{transaction.branch.name}</span>
          </div>
        )}

        {transaction.wallet?.name && (
          <div className="lumio-tx-detail__row">
            <span style={{ color: c.ink700 }}>{t.wallet.value}:</span>
            <span style={{ fontWeight: 600, color: c.ink900 }}>{transaction.wallet.name}</span>
          </div>
        )}
      </div>

      {/* Parsing Metadata */}
      {(transaction.parsingConfidence || transaction.rawExtract) && (
        <div className="lumio-tx-detail__card lumio-tx-detail__card--blue">
          <div
            className="lumio-tx-detail__label"
            style={{ color: 'var(--color-info-soft-text)', marginBottom: 8 }}
          >
            {t.parsingMetadata.value}
          </div>

          {transaction.parsingConfidence && (
            <div className="lumio-tx-detail__row">
              <span style={{ color: '#2563eb' }}>{t.confidence.value}:</span>
              <span style={{ fontWeight: 600, color: '#1e3a8a' }}>
                {(transaction.parsingConfidence * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {transaction.rawExtract && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#2563eb' }}>{t.rawExtract.value}:</span>
              <div
                style={{
                  marginTop: 4,
                  maxHeight: 80,
                  overflowY: 'auto',
                  borderRadius: tokens.radius.md,
                  backgroundColor: 'rgba(191, 219, 254, 0.8)',
                  padding: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: '#1e3a8a',
                }}
              >
                {transaction.rawExtract}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Category */}
      <div className="lumio-tx-detail__card">
        <div
          className="lumio-tx-detail__label"
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.ink800 }}
        >
          <Tag size={16} />
          {t.currentCategory.value}
        </div>
        <div style={{ marginTop: 8 }}>
          {transaction.category ? (
            <span
              className="lumio-tx-detail__cat-badge"
              style={{
                backgroundColor:
                  transaction.category.isEnabled === false
                    ? 'var(--color-error-soft-bg)'
                    : transaction.category.color
                      ? `${transaction.category.color}15`
                      : c.ink150,
                color:
                  transaction.category.isEnabled === false
                    ? '#b91c1c'
                    : transaction.category.color || c.ink800,
              }}
            >
              {transaction.category.isEnabled === false
                ? `${transaction.category.name} — select category`
                : transaction.category.name}
            </span>
          ) : (
            <span style={{ fontSize: 14, color: c.ink500 }}>{t.noCategory.value}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="lumio-tx-detail__actions">
        <div style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>{t.actions.value}</div>

        {/* Set Category */}
        {onUpdateCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              htmlFor="category-select"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.ink800 }}
            >
              {t.setCategory.value}
            </label>
            <div className="lumio-tx-detail__set-cat">
              <select
                id="category-select"
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="lumio-tx-detail__select"
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
                className="lumio-tx-detail__apply-btn"
              >
                {updating ? t.updating.value : t.apply.value}
              </button>
            </div>
          </div>
        )}

        {/* Split / Undo split */}
        {onSplitDone &&
          (transaction.splitGroupId ? (
            <button
              type="button"
              onClick={() => unsplit(transaction.id)}
              disabled={splitSaving}
              className="lumio-tx-detail__ignore-btn"
            >
              {splitSaving ? 'Undoing split...' : 'Undo split'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSplitOpen(true)}
              disabled={splitSaving || splitTotal <= 0}
              className="lumio-tx-detail__ignore-btn"
            >
              Split
            </button>
          ))}

        {/* Mark as Ignored */}
        {onMarkIgnored && (
          <button type="button" onClick={handleMarkIgnored} className="lumio-tx-detail__ignore-btn">
            {t.markIgnored.value}
          </button>
        )}
      </div>

      {onSplitDone && !transaction.splitGroupId && (
        <SplitTransactionDialog
          open={splitOpen}
          transactionId={transaction.id}
          totalAmount={splitTotal}
          currency={transaction.currency ?? 'KZT'}
          categories={splitCategories}
          saving={splitSaving}
          onClose={() => setSplitOpen(false)}
          onSubmit={parts => {
            void split(transaction.id, parts);
          }}
        />
      )}
    </div>
  );
}
