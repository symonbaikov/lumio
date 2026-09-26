/* eslint-disable max-lines */
'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MarkPaidDialog } from '@/app/(main)/statements/components/payables/MarkPaidDialog';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { ChevronLeft, Plus, Trash2 } from '@/app/components/icons';
import { CurrencyDrawer } from '@/app/components/receipts/components/CurrencyDrawer';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useCurrencyPickerState } from '@/app/hooks/useCurrencyPickerState';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { formatMoney } from '@/app/lib/format-money';
import {
  type Client,
  type CreateInvoiceInput,
  clientsApi,
  type Invoice,
  type InvoiceLineItemInput,
  type InvoiceRecurrenceInterval,
  invoicesApi,
} from '@/app/lib/invoices-api';
import { type MarkPayablePaidInput, type Payable, payablesApi } from '@/app/lib/payables-api';
import { getInvoiceStatusVariant } from './invoices-format';

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

const emptyLine = (): InvoiceLineItemInput => ({ description: '', quantity: 1, unitPrice: 0 });

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function computeTotals(lineItems: InvoiceLineItemInput[], taxRates: TaxRateOption[]) {
  const rateById = new Map(taxRates.map(rate => [rate.id, rate.rate]));
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of lineItems) {
    const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    const pct = item.taxRateId ? (rateById.get(item.taxRateId) ?? 0) : 0;
    subtotal += net;
    taxTotal += net * (pct / 100);
  }
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    subtotal: round(subtotal),
    taxTotal: round(taxTotal),
    total: round(subtotal + taxTotal),
  };
}

interface InvoiceDetailViewProps {
  invoiceId: string;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function InvoiceDetailView({ invoiceId }: InvoiceDetailViewProps): React.JSX.Element {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('invoicesPage');
  const isNew = invoiceId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 14));
  const [currency, setCurrency] = useState('KZT');
  const {
    currencyDrawerOpen,
    setCurrencyDrawerOpen,
    currencySearch,
    setCurrencySearch,
    selectedCurrencyItem,
    selectedMatchesSearch,
    currencyQuery,
    recentCurrencyItems,
    allCurrencyItems,
    pushRecentCurrency,
  } = useCurrencyPickerState(currency);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([emptyLine()]);
  const [recurrenceInterval, setRecurrenceInterval] = useState<InvoiceRecurrenceInterval | ''>('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [payingPayable, setPayingPayable] = useState<Payable | null>(null);

  const isEditable = isNew || invoice?.status === 'draft';

  const loadOptions = useCallback(async () => {
    const [clientList, taxRateResponse] = await Promise.all([
      clientsApi.list(),
      apiClient.get('/tax-rates'),
    ]);
    setClients(clientList);
    const rawTaxRates = (taxRateResponse.data?.data ?? taxRateResponse.data ?? []) as Array<
      TaxRateOption & { rate: number | string }
    >;
    setTaxRates(rawTaxRates.map(rate => ({ ...rate, rate: Number(rate.rate ?? 0) })));
  }, []);

  const loadInvoice = useCallback(async () => {
    if (isNew) {
      setCurrency(currentWorkspace?.currency?.toUpperCase() || 'KZT');
      return;
    }
    setLoading(true);
    await invoicesApi
      .getOne(invoiceId)
      .then(data => {
        setInvoice(data);
        setClientId(data.clientId);
        setIssueDate(data.issueDate.slice(0, 10));
        setDueDate(data.dueDate.slice(0, 10));
        setCurrency(data.currency);
        setNotes(data.notes || '');
        setRecurrenceInterval(data.recurrenceInterval || '');
        setLineItems(
          (data.lineItems || []).map(item => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRateId: item.taxRateId || undefined,
            categoryId: item.categoryId || undefined,
          })),
        );
      })
      .catch(error => {
        toast.error(getApiErrorMessage(error, t.detail.notFound.value));
      })
      .finally(() => setLoading(false));
  }, [invoiceId, isNew, currentWorkspace, t.detail.notFound.value]);

  useEffect(() => {
    void loadOptions();
    void loadInvoice();
  }, [loadOptions, loadInvoice]);

  const totals = useMemo(() => computeTotals(lineItems, taxRates), [lineItems, taxRates]);

  const updateLine = (index: number, patch: Partial<InvoiceLineItemInput>): void => {
    setLineItems(current => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number): void => {
    setLineItems(current => current.filter((_, i) => i !== index));
  };

  const handleSelectCurrency = (code: string): void => {
    setCurrency(code);
    pushRecentCurrency(code);
  };

  const canSave =
    clientId.length > 0 &&
    lineItems.length > 0 &&
    lineItems.every(line => line.description.trim().length > 0 && line.unitPrice >= 0);

  const buildPayload = (): CreateInvoiceInput => ({
    clientId,
    issueDate,
    dueDate,
    currency,
    notes: notes || undefined,
    lineItems: lineItems.map(line => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRateId: line.taxRateId || undefined,
      categoryId: line.categoryId || undefined,
    })),
    recurrenceInterval: recurrenceInterval || undefined,
  });

  const handleSave = async (): Promise<void> => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    await (isNew
      ? invoicesApi.create(buildPayload())
      : invoicesApi.update(invoiceId, buildPayload())
    )
      .then(saved => {
        toast.success(isNew ? t.toasts.createSuccess.value : t.toasts.updateSuccess.value);
        router.replace(`/invoices/${saved.id}`);
        setInvoice(saved);
      })
      .catch(error => {
        toast.error(getApiErrorMessage(error, t.toasts.genericFailed.value));
      })
      .finally(() => setSaving(false));
  };

  const handleSend = async (): Promise<void> => {
    if (!(invoice && window.confirm(t.confirm.send.value))) {
      return;
    }
    setActing(true);
    await invoicesApi
      .send(invoice.id)
      .then(updated => {
        setInvoice(updated);
        toast.success(t.toasts.sendSuccess.value);
      })
      .catch(error => toast.error(getApiErrorMessage(error, t.toasts.genericFailed.value)))
      .finally(() => setActing(false));
  };

  const handleVoid = async (): Promise<void> => {
    if (!(invoice && window.confirm(t.confirm.void.value))) {
      return;
    }
    setActing(true);
    await invoicesApi
      .void(invoice.id)
      .then(updated => {
        setInvoice(updated);
        toast.success(t.toasts.voidSuccess.value);
      })
      .catch(error => toast.error(getApiErrorMessage(error, t.toasts.genericFailed.value)))
      .finally(() => setActing(false));
  };

  const handleRecordPayment = async (): Promise<void> => {
    if (!invoice?.payableId) {
      return;
    }
    await payablesApi
      .getOne(invoice.payableId)
      .then(setPayingPayable)
      .catch(error => toast.error(getApiErrorMessage(error, t.toasts.genericFailed.value)));
  };

  const confirmMarkPaid = async (
    payable: Payable,
    payload: MarkPayablePaidInput,
  ): Promise<void> => {
    await payablesApi
      .markAsPaid(payable.id, payload)
      .then(async () => {
        setPayingPayable(null);
        await loadInvoice();
      })
      .catch(error => toast.error(getApiErrorMessage(error, t.toasts.genericFailed.value)));
  };

  if (loading) {
    return <div style={{ padding: 40 }}>—</div>;
  }

  return (
    <div className="container-shared lumio-stmt-list">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.push('/invoices')}
          aria-label={t.actions.back.value}
          style={{ display: 'flex', border: 0, background: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          {invoice?.invoiceNumber ?? t.detail.newTitle}
        </h1>
        {invoice && (
          <Badge variant={getInvoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {invoice?.status !== 'draft' && invoice && (
            <Button
              variant="outline"
              onClick={() =>
                void invoicesApi.downloadPdf(invoice.id, `${invoice.invoiceNumber}.pdf`)
              }
            >
              {t.actions.downloadPdf.value}
            </Button>
          )}
          {invoice?.payableId && invoice.status !== 'paid' && invoice.status !== 'void' && (
            <Button variant="outline" onClick={() => void handleRecordPayment()}>
              {t.actions.recordPayment.value}
            </Button>
          )}
          {invoice?.status === 'draft' && (
            <Button disabled={acting} onClick={() => void handleSend()}>
              {t.actions.send.value}
            </Button>
          )}
          {(invoice?.status === 'draft' || invoice?.status === 'sent') && (
            <Button variant="outline" disabled={acting} onClick={() => void handleVoid()}>
              {t.actions.void.value}
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>
        <div className="lumio-payable-drawer__field-group">
          <label className="lumio-payable-drawer__field-label" htmlFor="invoice-client">
            {t.detail.client.value}
          </label>
          <Select
            fullWidth
            id="invoice-client"
            value={clientId}
            disabled={!isEditable}
            onChange={setClientId}
            options={clients.map(client => ({ value: client.id, label: client.name }))}
          />
        </div>

        <div className="lumio-payable-drawer__2col">
          <CustomDatePicker
            label={t.columns.issueDate.value}
            value={issueDate}
            onChange={isEditable ? setIssueDate : () => undefined}
          />
          <CustomDatePicker
            label={t.columns.dueDate.value}
            value={dueDate}
            onChange={isEditable ? setDueDate : () => undefined}
          />
        </div>

        <div className="lumio-payable-drawer__2col">
          <div className="lumio-payable-drawer__field-group">
            <label className="lumio-payable-drawer__field-label" htmlFor="invoice-currency">
              {t.detail.currency.value}
            </label>
            <button
              id="invoice-currency"
              type="button"
              className="lumio-payable-drawer__currency-trigger"
              onClick={() => isEditable && setCurrencyDrawerOpen(true)}
              disabled={!isEditable}
              aria-label={t.detail.currency.value}
            >
              {currency}
            </button>
          </div>
          <div className="lumio-payable-drawer__field-group">
            <label className="lumio-payable-drawer__field-label" htmlFor="invoice-recurrence">
              {t.detail.recurring.value}
            </label>
            <Select
              fullWidth
              id="invoice-recurrence"
              value={recurrenceInterval || 'none'}
              disabled={!isEditable}
              onChange={next =>
                setRecurrenceInterval(next === 'none' ? '' : (next as InvoiceRecurrenceInterval))
              }
              options={[
                { value: 'none', label: t.actions.cancel.value },
                { value: 'weekly', label: t.detail.recurrenceInterval.weekly.value },
                { value: 'monthly', label: t.detail.recurrenceInterval.monthly.value },
                { value: 'quarterly', label: t.detail.recurrenceInterval.quarterly.value },
                { value: 'yearly', label: t.detail.recurrenceInterval.yearly.value },
              ]}
            />
          </div>
        </div>

        <div>
          <div style={{ overflowX: 'auto' }}>
            <table className="lumio-invoice-lines__table">
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                {isEditable && <col style={{ width: '6%' }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className="lumio-invoice-lines__th">{t.detail.description.value}</th>
                  <th className="lumio-invoice-lines__th">{t.detail.quantity.value}</th>
                  <th className="lumio-invoice-lines__th">{t.detail.unitPrice.value}</th>
                  <th className="lumio-invoice-lines__th">{t.detail.taxRate.value}</th>
                  <th className="lumio-invoice-lines__th lumio-invoice-lines__th--right">
                    {t.detail.amount.value}
                  </th>
                  {isEditable && <th className="lumio-invoice-lines__th" />}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id before saving
                  <tr key={index} className="lumio-invoice-lines__row">
                    <td className="lumio-invoice-lines__td">
                      <Input
                        value={line.description}
                        disabled={!isEditable}
                        onChange={event => updateLine(index, { description: event.target.value })}
                      />
                    </td>
                    <td className="lumio-invoice-lines__td">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={String(line.quantity)}
                        disabled={!isEditable}
                        onChange={event =>
                          updateLine(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="lumio-invoice-lines__td">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(line.unitPrice)}
                        disabled={!isEditable}
                        onChange={event =>
                          updateLine(index, { unitPrice: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="lumio-invoice-lines__td">
                      <Select
                        fullWidth
                        value={line.taxRateId || 'none'}
                        disabled={!isEditable}
                        onChange={next =>
                          updateLine(index, { taxRateId: next === 'none' ? undefined : next })
                        }
                        options={[
                          { value: 'none', label: t.detail.noTax.value },
                          ...taxRates.map(rate => ({
                            value: rate.id,
                            label: `${rate.name} (${rate.rate}%)`,
                          })),
                        ]}
                        // Anchoring to the selected item (MUI's default) can place the
                        // menu off-screen inside this table's horizontally scrollable,
                        // narrow column; open it as a plain dropdown below the field.
                        MenuProps={{
                          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                          transformOrigin: { vertical: 'top', horizontal: 'left' },
                        }}
                      />
                    </td>
                    <td className="lumio-invoice-lines__td lumio-invoice-lines__td--right">
                      {formatMoney(
                        Number(line.quantity) * Number(line.unitPrice),
                        currency,
                        locale,
                      )}
                    </td>
                    {isEditable && (
                      <td className="lumio-invoice-lines__td">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t.actions.delete.value}
                          onClick={() => removeLine(index)}
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditable && (
            <Button
              variant="outline"
              style={{ marginTop: 8 }}
              onClick={() => setLineItems(current => [...current, emptyLine()])}
            >
              <Plus size={16} />
              {t.actions.addLine.value}
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'grid', gap: 4, minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>{t.detail.subtotal.value}</span>
              <span>{formatMoney(totals.subtotal, currency, locale)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>{t.detail.tax.value}</span>
              <span>{formatMoney(totals.taxTotal, currency, locale)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <span>{t.columns.total.value}</span>
              <span>{formatMoney(totals.total, currency, locale)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="lumio-payable-drawer__field-label" htmlFor="invoice-notes">
            {t.detail.notes.value}
          </label>
          <textarea
            id="invoice-notes"
            className="lumio-payable-drawer__textarea"
            value={notes}
            disabled={!isEditable}
            onChange={event => setNotes(event.target.value)}
          />
        </div>

        {isEditable && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => router.push('/invoices')}>
              {t.actions.cancel.value}
            </Button>
            <Button disabled={!canSave || saving} onClick={() => void handleSave()}>
              {saving ? t.actions.saving.value : t.actions.save.value}
            </Button>
          </div>
        )}
      </div>

      <MarkPaidDialog
        payable={payingPayable}
        submitting={false}
        onClose={() => setPayingPayable(null)}
        onConfirm={(payable, payload) => void confirmMarkPaid(payable, payload)}
      />

      <CurrencyDrawer
        isOpen={currencyDrawerOpen}
        onClose={() => setCurrencyDrawerOpen(false)}
        currencySearch={currencySearch}
        setCurrencySearch={setCurrencySearch}
        selectedCurrencyItem={selectedCurrencyItem}
        selectedMatchesSearch={selectedMatchesSearch}
        currencyQuery={currencyQuery}
        recentCurrencyItems={recentCurrencyItems}
        allCurrencyItems={allCurrencyItems}
        handleSelectCurrency={handleSelectCurrency}
        zIndex={1400}
      />
    </div>
  );
}
