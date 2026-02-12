'use client';

import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import {
  ALWAYS_ALLOW_STATEMENT_DUPLICATES,
  type CurrencySearchItem,
  type ManualExpenseDraft,
  type StatementExpenseMode,
  buildCurrencySearchIndex,
  computeManualAmountFontSize,
  hasPositiveManualAmount,
  resolveExpenseDrawerMode,
  sanitizeManualAmountInput,
  validateManualExpenseDraft,
} from '@/app/lib/statement-expense-drawer';
import { cn } from '@/app/lib/utils';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  PencilLine,
  Plus,
  ScanLine,
  Search,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  open: boolean;
  initialMode: StatementExpenseMode;
  onClose: () => void;
  onSubmitScan: (payload: {
    files: File[];
    allowDuplicates: boolean;
    requireManualCategorySelection: boolean;
  }) => Promise<void>;
  onSubmitManual: (payload: {
    draft: ManualExpenseDraft;
    date: string;
    files: File[];
    allowDuplicates: boolean;
  }) => Promise<void>;
};

const createDefaultManualDraft = (): ManualExpenseDraft => ({
  amount: '',
  currency: 'KZT',
  description: '',
  merchant: '',
});

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

type ManualStep = 'amount' | 'details';

export default function CreateExpenseDrawer({
  open,
  initialMode,
  onClose,
  onSubmitScan,
  onSubmitManual,
}: Props) {
  const [mode, setMode] = useState<StatementExpenseMode>('scan');
  const [manualStep, setManualStep] = useState<ManualStep>('amount');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [manualRecentCurrencies, setManualRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [manualDraft, setManualDraft] = useState<ManualExpenseDraft>(createDefaultManualDraft());
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualAmountInputRef = useRef<HTMLInputElement | null>(null);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);

  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );

  const selectedCurrencyItem = currencyByCode.get(manualDraft.currency);
  const selectedCurrencySymbol = selectedCurrencyItem?.symbol ?? manualDraft.currency;
  const manualAmountFontSize = useMemo(
    () => computeManualAmountFontSize(manualDraft.amount),
    [manualDraft.amount],
  );

  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      manualRecentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== manualDraft.currency),
    [manualRecentCurrencies, currencyByCode, manualDraft.currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== manualDraft.currency);
  }, [currencyItems, currencyQuery, manualDraft.currency]);

  const hasManualAmount = useMemo(
    () => hasPositiveManualAmount(manualDraft.amount),
    [manualDraft.amount],
  );

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      return;
    }

    const resolvedMode = resolveExpenseDrawerMode(initialMode);
    setMode(resolvedMode);
    setManualStep('amount');
    setCurrencyPickerOpen(false);
    setCurrencySearch('');
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || mode !== 'manual' || manualStep !== 'amount' || currencyPickerOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      manualAmountInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, mode, manualStep, currencyPickerOpen]);

  const manualValidation = useMemo(() => validateManualExpenseDraft(manualDraft), [manualDraft]);

  const pushRecentCurrency = (currencyCode: string) => {
    setManualRecentCurrencies(prev => [
      currencyCode,
      ...prev.filter(item => item !== currencyCode),
    ]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    setManualDraft(prev => ({ ...prev, currency: currencyCode }));
    pushRecentCurrency(currencyCode);
    setCurrencySearch('');
    setCurrencyPickerOpen(false);
  };

  const handleClose = () => {
    setMode('scan');
    setManualStep('amount');
    setCurrencyPickerOpen(false);
    setCurrencySearch('');
    setFiles([]);
    setManualDraft(createDefaultManualDraft());
    setManualDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleBackClick = () => {
    if (mode === 'manual' && currencyPickerOpen) {
      setCurrencyPickerOpen(false);
      setCurrencySearch('');
      return;
    }

    if (mode === 'manual' && manualStep === 'details') {
      setManualStep('amount');
      return;
    }

    handleClose();
  };

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    setFiles(Array.from(selected));
    setError(null);
  };

  const handleManualNext = () => {
    if (!hasManualAmount) {
      setError('Enter a valid amount');
      return;
    }

    setError(null);
    setManualStep('details');
  };

  const handleSubmitScan = async () => {
    if (files.length === 0) {
      setError('Choose at least one file');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmitScan({
        files,
        allowDuplicates: ALWAYS_ALLOW_STATEMENT_DUPLICATES,
        requireManualCategorySelection: true,
      });
      handleClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to upload files');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!manualValidation.amount || !manualValidation.merchant) {
      setError('Amount and merchant are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmitManual({
        draft: manualDraft,
        date: manualDate,
        files,
        allowDuplicates: ALWAYS_ALLOW_STATEMENT_DUPLICATES,
      });
      handleClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit manual expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={handleClose}
      position="right"
      width="lg"
      showCloseButton={false}
      className="bg-[#fbfaf8] border-l-0"
      title={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close create expense drawer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-[#0f3428]">
            {currencyPickerOpen
              ? 'Select a currency'
              : mode === 'manual' && manualStep === 'details'
                ? 'Confirm details'
                : 'Create expense'}
          </span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {!currencyPickerOpen ? (
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-full bg-white p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setManualStep('amount');
                setCurrencyPickerOpen(false);
              }}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                mode === 'manual'
                  ? 'bg-[#ebe8e2] text-[#0f3428]'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-[#0f3428]',
              )}
            >
              <PencilLine className="h-4 w-4" />
              Manual
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('scan');
                setCurrencyPickerOpen(false);
              }}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                mode === 'scan'
                  ? 'bg-[#ebe8e2] text-[#0f3428]'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-[#0f3428]',
              )}
            >
              <ScanLine className="h-4 w-4" />
              Scan
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto space-y-4 pb-6">
          {currencyPickerOpen ? (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={event => setCurrencySearch(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-2xl border border-primary bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none"
                />
              </div>

              {selectedCurrencyItem && selectedMatchesSearch ? (
                <button
                  type="button"
                  onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#ebe8e2] px-4 py-4 text-left"
                >
                  <span className="text-base font-semibold text-[#0f3428]">
                    {selectedCurrencyItem.label}
                  </span>
                  <Check className="h-5 w-5 text-primary" />
                </button>
              ) : null}

              {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
                <div>
                  <p className="px-1 text-sm text-gray-500">Recents</p>
                  <div className="mt-2 space-y-2">
                    {recentCurrencyItems.map(item => (
                      <button
                        key={`recent-${item.code}`}
                        type="button"
                        onClick={() => handleSelectCurrency(item.code)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f1efea]"
                      >
                        <span className="text-base font-semibold text-[#0f3428]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="px-1 text-sm text-gray-500">All</p>
                <div className="mt-2 space-y-1">
                  {allCurrencyItems.length > 0 ? (
                    allCurrencyItems.map(item => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelectCurrency(item.code)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f1efea]"
                      >
                        <span className="text-base font-semibold text-[#0f3428]">{item.label}</span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-xl bg-white px-3 py-3 text-sm text-gray-500">
                      No currencies found
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : mode === 'scan' ? (
            <>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-[#f8f7f4] px-6 py-12 text-center">
                <FileText className="h-14 w-14 text-[#9ea6a0]" />
                <p className="mt-6 text-[30px] font-semibold leading-none text-[#0f3428]">
                  Upload receipts
                </p>
                <p className="mt-2 text-sm text-gray-500">or drag and drop them here</p>
                <span className="mt-6 inline-flex rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-white">
                  Choose files
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={event => handleFilesSelected(event.target.files)}
                />
              </label>
            </>
          ) : manualStep === 'amount' ? (
            <div className="flex min-h-full flex-col justify-between">
              <div className="flex flex-1 flex-col items-center justify-center">
                <label htmlFor="expense-manual-amount" className="sr-only">
                  Amount
                </label>
                <div className="mx-auto w-[290px] max-w-full">
                  <div className="flex h-24 w-full items-end justify-center gap-2">
                    <span
                      className="shrink-0 leading-none font-semibold text-[#0f3428]"
                      style={{ fontSize: manualAmountFontSize }}
                    >
                      {selectedCurrencySymbol}
                    </span>
                    <input
                      ref={manualAmountInputRef}
                      id="expense-manual-amount"
                      inputMode="decimal"
                      value={manualDraft.amount}
                      onChange={event =>
                        setManualDraft(prev => ({
                          ...prev,
                          amount: sanitizeManualAmountInput(event.target.value),
                        }))
                      }
                      placeholder="0"
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 leading-none font-semibold text-[#0f3428] placeholder:text-[#9ea6a0] focus:outline-none"
                      style={{ fontSize: manualAmountFontSize }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrencyPickerOpen(true)}
                    className="mt-12 inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-[#ebe8e2] px-6 text-lg font-semibold text-[#0f3428]"
                  >
                    {manualDraft.currency}
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <label className="relative flex cursor-pointer items-center justify-center rounded-3xl border border-gray-200 bg-[#f8f7f4] px-6 py-12 text-center">
                <FileText className="h-20 w-20 text-[#d8d4ce]" />
                <span className="absolute left-1/2 top-1/2 flex h-12 w-12 translate-x-2.5 translate-y-1 items-center justify-center rounded-full bg-primary text-white">
                  <Plus className="h-6 w-6" />
                </span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={event => handleFilesSelected(event.target.files)}
                />
              </label>

              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setManualStep('amount')}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#f8f7f4]"
                >
                  <div>
                    <p className="text-sm text-[#70817b]">Amount</p>
                    <p className="mt-1 text-[42px] leading-none font-semibold text-[#0f3428]">
                      {selectedCurrencySymbol}
                      {manualDraft.amount || '0.00'}
                    </p>
                  </div>
                  <ChevronRight className="h-8 w-8 text-[#9ea6a0]" />
                </button>

                <div className="h-px bg-gray-100" />

                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expense-manual-description" className="text-sm text-[#70817b]">
                      Description
                    </label>
                    <ChevronRight className="h-8 w-8 text-[#9ea6a0]" />
                  </div>
                  <input
                    id="expense-manual-description"
                    value={manualDraft.description}
                    onChange={event =>
                      setManualDraft(prev => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="mt-2 w-full border-0 bg-transparent p-0 text-[32px] leading-none text-[#0f3428] placeholder:text-[#9ea6a0] focus:outline-none"
                  />
                </div>

                <div className="h-px bg-gray-100" />

                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expense-manual-merchant" className="text-sm text-[#70817b]">
                      Merchant
                    </label>
                    <ChevronRight className="h-8 w-8 text-[#9ea6a0]" />
                  </div>
                  <input
                    id="expense-manual-merchant"
                    value={manualDraft.merchant}
                    onChange={event =>
                      setManualDraft(prev => ({
                        ...prev,
                        merchant: event.target.value,
                      }))
                    }
                    placeholder="Required"
                    className="mt-2 w-full border-0 bg-transparent p-0 text-[32px] leading-none text-[#0f3428] placeholder:text-[#9ea6a0] focus:outline-none"
                  />
                  {!manualValidation.merchant ? (
                    <p className="mt-3 text-sm text-red-500">This field is required</p>
                  ) : null}
                </div>

                <div className="h-px bg-gray-100" />

                <div className="px-5 py-4">
                  <label htmlFor="expense-manual-date" className="text-sm text-[#70817b]">
                    Date
                  </label>
                  <div className="mt-2 flex items-center justify-between">
                    <input
                      id="expense-manual-date"
                      type="date"
                      value={manualDate}
                      onChange={event => setManualDate(event.target.value)}
                      className="border-0 bg-transparent p-0 text-[32px] leading-none text-[#0f3428] focus:outline-none"
                    />
                    <Calendar className="h-6 w-6 text-[#9ea6a0]" />
                  </div>
                </div>
              </div>
            </>
          )}

          {files.length > 0 && !currencyPickerOpen ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Selected files
              </p>
              <div className="mt-2 space-y-2">
                {files.map(file => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-800">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="pt-4">
          <Button
            type="button"
            size="lg"
            className={cn(
              'w-full rounded-full',
              mode === 'manual' ? 'bg-primary hover:bg-primary-hover' : '',
            )}
            disabled={
              submitting ||
              currencyPickerOpen ||
              (mode === 'manual' && manualStep === 'amount' && !hasManualAmount)
            }
            onClick={
              mode === 'scan'
                ? handleSubmitScan
                : manualStep === 'amount'
                  ? handleManualNext
                  : handleSubmitManual
            }
          >
            {submitting
              ? 'Saving...'
              : mode === 'scan'
                ? 'Upload receipt'
                : manualStep === 'amount'
                  ? 'Next'
                  : `Create ${selectedCurrencySymbol}${manualDraft.amount || '0.00'} expense`}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}
