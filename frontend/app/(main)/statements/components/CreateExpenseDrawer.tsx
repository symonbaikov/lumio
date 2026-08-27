'use client';

import StatementCategoryDrawer from '@/app/(main)/statements/[id]/edit/StatementCategoryDrawer';
import { useExpenseForm } from '@/app/(main)/statements/components/hooks/useExpenseForm';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  PencilLine,
  Plus,
  Receipt,
  ScanLine,
  Search,
} from '@/app/components/icons';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { type StatementCategoryNode } from '@/app/lib/statement-categories';
import {
  type CreateTaxRatePayload,
  type ManualExpenseDraft,
  type StatementExpenseMode,
  type TaxRateOption,
  sanitizeManualAmountInput,
} from '@/app/lib/statement-expense-drawer';
import { tokens } from '@/lib/theme-tokens';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  open: boolean;
  initialMode: StatementExpenseMode;
  defaultCurrency?: string | null;
  categories: StatementCategoryNode[];
  taxRates: TaxRateOption[];
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
  onCreateTaxRate?: (payload: CreateTaxRatePayload) => Promise<TaxRateOption>;
};

/**
 * One row of the "Confirm details" list. Every field uses the same label /
 * value / divider rhythm; the chevron marks the rows that open a sub-drawer,
 * so it stays an honest navigation affordance instead of decoration.
 */
const DETAIL_VALUE_STYLE = {
  marginTop: 4,
  fontSize: 17,
  lineHeight: 1.4,
  color: 'var(--foreground)',
} as const;

const DETAIL_INPUT_STYLE = {
  ...DETAIL_VALUE_STYLE,
  width: '100%',
  border: 0,
  background: 'transparent',
  padding: 0,
  outline: 'none',
} as const;

function DetailRow({
  label,
  htmlFor,
  error,
  onClick,
  isLast,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  onClick?: () => void;
  isLast?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  // Rows that own an input get a real <label>; the rest are buttons or
  // self-labelled controls, where a <label> would be dangling or nested.
  const LabelTag = htmlFor ? 'label' : 'span';
  const body = (
    <>
      <div style={{ minWidth: 0, flex: 1 }}>
        <LabelTag
          htmlFor={htmlFor}
          style={{ fontSize: 13, color: 'var(--muted-foreground)', display: 'block' }}
        >
          {label}
        </LabelTag>
        {children}
        {error ? (
          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--destructive)' }}>{error}</p>
        ) : null}
      </div>
      {onClick ? (
        <ChevronRight size={20} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
      ) : null}
    </>
  );

  const rowStyle = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    textAlign: 'left' as const,
    borderBottom: isLast ? 'none' : '1px solid var(--border-color, var(--border-color))',
  };

  if (!onClick) {
    return <div style={rowStyle}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...rowStyle,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        borderBottom: rowStyle.borderBottom,
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'none';
      }}
    >
      {body}
    </button>
  );
}

export default function CreateExpenseDrawer({
  open,
  initialMode,
  defaultCurrency,
  categories,
  taxRates,
  onClose,
  onSubmitScan,
  onSubmitManual,
  onCreateTaxRate,
}: Props) {
  const isMobile = useIsMobile();
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const scanGalleryInputRef = useRef<HTMLInputElement>(null);
  const [createdTaxRates, setCreatedTaxRates] = useState<TaxRateOption[]>([]);
  const mergedTaxRates = useMemo(() => {
    const existingIds = new Set(taxRates.map(taxRate => taxRate.id));
    return [...taxRates, ...createdTaxRates.filter(taxRate => !existingIds.has(taxRate.id))];
  }, [taxRates, createdTaxRates]);
  const {
    mode,
    setMode,
    manualStep,
    setManualStep,
    currencyPickerOpen,
    setCurrencyPickerOpen,
    categoryDrawerOpen,
    setCategoryDrawerOpen,
    taxRateDrawerOpen,
    setTaxRateDrawerOpen,
    currencySearch,
    setCurrencySearch,
    files,
    manualDraft,
    setManualDraft,
    manualDate,
    setManualDate,
    submitting,
    error,
    setError,
    fileInputRef,
    manualAmountInputRef,
    selectedCurrencyItem,
    selectedCurrencySymbol,
    manualAmountFontSize,
    selectedCategoryName,
    defaultTaxRate,
    selectedTaxRate,
    enabledTaxRates,
    selectedMatchesSearch,
    recentCurrencyItems,
    allCurrencyItems,
    hasManualAmount,
    manualValidation,
    handleSelectCurrency,
    handleClose,
    handleBackClick,
    handleFilesSelected,
    handleManualNext,
    handleSubmitScan,
    handleSubmitManual,
  } = useExpenseForm({
    open,
    initialMode,
    defaultCurrency,
    categories,
    taxRates: mergedTaxRates,
    onClose,
    onSubmitScan,
    onSubmitManual,
  });
  const [taxRateName, setTaxRateName] = useState('');
  const [taxRateValue, setTaxRateValue] = useState('');
  const [taxRateSaving, setTaxRateSaving] = useState(false);
  const [taxRateError, setTaxRateError] = useState<string | null>(null);

  const currencyQuery = currencySearch.trim().toLowerCase();

  useEffect(() => {
    if (!taxRateDrawerOpen) {
      setTaxRateName('');
      setTaxRateValue('');
      setTaxRateError(null);
      setTaxRateSaving(false);
    }
  }, [taxRateDrawerOpen]);

  useEffect(() => {
    if (!open) {
      setCreatedTaxRates([]);
    }
  }, [open]);

  const handleCreateTaxRate = async (): Promise<void> => {
    const name = taxRateName.trim();
    const rate = Number(taxRateValue);

    if (!name) {
      setTaxRateError('Tax rate name is required');
      return;
    }

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setTaxRateError('Tax percentage must be between 0 and 100');
      return;
    }

    if (!onCreateTaxRate) {
      setTaxRateError('Tax rate creation is unavailable');
      return;
    }

    setTaxRateSaving(true);
    setTaxRateError(null);

    try {
      const created = await onCreateTaxRate({ name, rate, isEnabled: true });
      const normalizedCreated = {
        ...created,
        rate: Number(created.rate ?? rate),
        isEnabled: created.isEnabled !== false,
      };
      setCreatedTaxRates(prev => [normalizedCreated, ...prev]);
      setManualDraft(prev => ({
        ...prev,
        taxRateId: normalizedCreated.id,
      }));
      setTaxRateDrawerOpen(false);
    } catch (createError: unknown) {
      const message =
        createError instanceof Error ? createError.message : 'Failed to save tax rate';
      setTaxRateError(message);
    } finally {
      setTaxRateSaving(false);
    }
  };

  return (
    <>
      <DrawerShell
        isOpen={open}
        onClose={handleClose}
        position="right"
        width="lg"
        showCloseButton={false}
        title={
          <div className="lumio-payable-drawer__title-wrap">
            <button
              type="button"
              onClick={handleBackClick}
              className="lumio-col-drawer__back-btn"
              aria-label="Close create expense drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
              {currencyPickerOpen
                ? 'Select a currency'
                : mode === 'manual' && manualStep === 'details'
                  ? 'Confirm details'
                  : 'Create expense'}
            </span>
          </div>
        }
      >
        <div className="lumio-expense-drawer">
          {!currencyPickerOpen ? (
            <div className="lumio-expense-drawer__tabs">
              <button
                type="button"
                onClick={() => {
                  setMode('manual');
                  setManualStep('amount');
                  setCurrencyPickerOpen(false);
                }}
                className={`lumio-expense-drawer__tab${mode === 'manual' ? ' lumio-expense-drawer__tab--active' : ''}`}
              >
                <PencilLine size={16} />
                Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('scan');
                  setCurrencyPickerOpen(false);
                }}
                className={`lumio-expense-drawer__tab${mode === 'scan' ? ' lumio-expense-drawer__tab--active' : ''}`}
              >
                <ScanLine size={16} />
                Scan
              </button>
            </div>
          ) : null}

          <div className="lumio-expense-drawer__content">
            {currencyPickerOpen ? (
              <>
                <div className="lumio-expense-drawer__search">
                  <Search size={16} className="lumio-expense-drawer__search-icon" />
                  <input
                    type="text"
                    value={currencySearch}
                    onChange={event => setCurrencySearch(event.target.value)}
                    placeholder="Search"
                    className="lumio-expense-drawer__search-input"
                  />
                </div>

                {selectedCurrencyItem && selectedMatchesSearch ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                    className="lumio-expense-drawer__currency-selected"
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                      {selectedCurrencyItem.label}
                    </span>
                    <Check size={20} style={{ color: 'var(--primary)' }} />
                  </button>
                ) : null}

                {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
                  <div className="lumio-expense-drawer__section">
                    <p className="lumio-expense-drawer__label">Recents</p>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentCurrencyItems.map(item => (
                        <button
                          key={`recent-${item.code}`}
                          type="button"
                          onClick={() => handleSelectCurrency(item.code)}
                          className="lumio-expense-drawer__currency-item"
                        >
                          <span
                            style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
                          >
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="lumio-expense-drawer__section">
                  <p className="lumio-expense-drawer__label">All</p>
                  <div className="lumio-expense-drawer__all-list">
                    {allCurrencyItems.length > 0 ? (
                      allCurrencyItems.map(item => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectCurrency(item.code)}
                          className="lumio-expense-drawer__currency-item"
                        >
                          <span
                            style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
                          >
                            {item.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="lumio-expense-drawer__no-result">No currencies found</p>
                    )}
                  </div>
                </div>
              </>
            ) : mode === 'scan' ? (
              <>
                {isMobile ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      borderRadius: tokens.radius.lg,
                      border: '1px solid var(--border-color)',
                      background: 'rgba(0,0,0,0.04)',
                      padding: 16,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => scanCameraInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        minHeight: 72,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        borderRadius: tokens.radius.md,
                        border: 'none',
                        background: 'var(--primary-fill)',
                        padding: '16px 20px',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <Camera size={20} />
                      Take photo
                    </button>
                    <button
                      type="button"
                      onClick={() => scanGalleryInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        minHeight: 72,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        borderRadius: tokens.radius.md,
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        padding: '16px 20px',
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      <ImageIcon size={20} />
                      Choose from gallery
                    </button>
                    <input
                      ref={scanCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={event => handleFilesSelected(event.target.files)}
                    />
                    <input
                      ref={scanGalleryInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      multiple
                      onChange={event => handleFilesSelected(event.target.files)}
                    />
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      cursor: 'pointer',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: tokens.radius.lg,
                      border: '2px dashed',
                      borderColor: 'color-mix(in srgb, var(--primary) 40%, transparent)',
                      background: 'rgba(0,0,0,0.04)',
                      padding: '48px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <Receipt size={56} style={{ color: 'var(--muted-foreground)' }} />
                    <p
                      style={{
                        marginTop: 24,
                        fontSize: 30,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: 'var(--foreground)',
                      }}
                    >
                      Upload receipts
                    </p>
                    <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted-foreground)' }}>
                      or drag and drop them here
                    </p>
                    <span
                      style={{
                        marginTop: 24,
                        display: 'inline-flex',
                        borderRadius: tokens.radius.md,
                        background: 'var(--primary-fill)',
                        padding: '10px 28px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      Choose files
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      style={{ display: 'none' }}
                      multiple
                      onChange={event => handleFilesSelected(event.target.files)}
                    />
                  </label>
                )}
              </>
            ) : manualStep === 'amount' ? (
              <div
                style={{
                  display: 'flex',
                  minHeight: '100%',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <label htmlFor="expense-manual-amount" className="sr-only">
                    Amount
                  </label>
                  <div style={{ margin: '0 auto', width: 290, maxWidth: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        height: 96,
                        width: '100%',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          lineHeight: 1,
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          fontSize: manualAmountFontSize,
                        }}
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
                        style={{
                          minWidth: 0,
                          flex: 1,
                          border: 0,
                          background: 'transparent',
                          padding: 0,
                          lineHeight: 1,
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          fontSize: manualAmountFontSize,
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrencyPickerOpen(true)}
                      style={{
                        marginTop: 48,
                        display: 'inline-flex',
                        height: 64,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderRadius: tokens.radius.md,
                        border: '1px solid var(--border-color, var(--border-color))',
                        background: 'var(--muted)',
                        padding: '0 24px',
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      {manualDraft.currency}
                      <ChevronDown size={20} style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label
                  style={{
                    position: 'relative',
                    display: 'flex',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: tokens.radius.lg,
                    border: '1px solid var(--border-color, var(--border-color))',
                    background: 'rgba(0,0,0,0.04)',
                    padding: '32px 24px',
                    textAlign: 'center',
                  }}
                >
                  <FileText
                    size={56}
                    style={{
                      color: 'color-mix(in srgb, var(--muted-foreground) 60%, transparent)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      display: 'flex',
                      height: 40,
                      width: 40,
                      transform: 'translate(8px, 4px)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: tokens.radius.full,
                      background: 'var(--primary-fill)',
                      color: '#fff',
                    }}
                  >
                    <Plus size={20} />
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.csv,.xlsx,.xls"
                    capture="environment"
                    style={{ display: 'none' }}
                    multiple
                    onChange={event => handleFilesSelected(event.target.files)}
                  />
                </label>

                <div
                  style={{
                    overflow: 'hidden',
                    borderRadius: tokens.radius.lg,
                    border: '1px solid var(--border-color, var(--border-color))',
                    background: 'var(--card-bg, #fff)',
                  }}
                >
                  <DetailRow label="Amount" onClick={() => setManualStep('amount')}>
                    <span style={{ ...DETAIL_VALUE_STYLE, fontSize: 28, fontWeight: 600 }}>
                      {selectedCurrencySymbol}
                      {manualDraft.amount || '0.00'}
                    </span>
                  </DetailRow>

                  <DetailRow label="Description" htmlFor="expense-manual-description">
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
                      style={DETAIL_INPUT_STYLE}
                    />
                  </DetailRow>

                  <DetailRow
                    label="Merchant"
                    htmlFor="expense-manual-merchant"
                    error={!manualValidation.merchant ? 'This field is required' : null}
                  >
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
                      style={DETAIL_INPUT_STYLE}
                    />
                  </DetailRow>

                  <DetailRow
                    label="Category"
                    onClick={() => setCategoryDrawerOpen(true)}
                    error={!manualValidation.category ? 'This field is required' : null}
                  >
                    <span
                      style={{
                        ...DETAIL_VALUE_STYLE,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: selectedCategoryName
                          ? 'var(--foreground)'
                          : 'var(--muted-foreground)',
                      }}
                    >
                      {selectedCategoryName || 'Required'}
                    </span>
                  </DetailRow>

                  <DetailRow label="Date">
                    <DatePicker
                      value={manualDate ? parseISO(manualDate) : null}
                      onChange={(d: Date | null) =>
                        setManualDate(d && isValid(d) ? format(d, 'yyyy-MM-dd') : '')
                      }
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: 'standard',
                          InputProps: { disableUnderline: true },
                          inputProps: { 'aria-label': 'Date' },
                          sx: {
                            '& .MuiInputBase-input': {
                              p: 0,
                              fontSize: 17,
                              lineHeight: 1.4,
                              color: 'var(--foreground)',
                            },
                          },
                        } as never,
                      }}
                    />
                  </DetailRow>

                  <DetailRow label="Tax" onClick={() => setTaxRateDrawerOpen(true)} isLast>
                    <span
                      style={{
                        ...DETAIL_VALUE_STYLE,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: selectedTaxRate ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {selectedTaxRate
                        ? `${selectedTaxRate.name} (${Number(selectedTaxRate.rate || 0).toFixed(0)}%)${selectedTaxRate.isDefault ? ' - Default' : ''}`
                        : 'Optional'}
                    </span>
                  </DetailRow>
                </div>
              </>
            )}

            {files.length > 0 && !currencyPickerOpen ? (
              <div
                style={{
                  borderRadius: tokens.radius.lg,
                  border: '1px solid var(--border-color, var(--border-color))',
                  background: 'var(--card-bg, #fff)',
                  padding: '12px',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Selected files
                </p>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map(file => (
                    <div
                      key={`${file.name}-${file.size}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: tokens.radius.sm,
                        border: '1px solid var(--border-color, var(--border-color))',
                        padding: '8px 12px',
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--foreground)',
                        }}
                      >
                        {file.name}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  borderRadius: tokens.radius.sm,
                  border: '1px solid #fecaca',
                  background: 'var(--color-error-soft-bg)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--destructive)',
                }}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div style={{ paddingTop: 16 }}>
            <Button
              type="button"
              size="lg"
              style={{ width: '100%', borderRadius: tokens.radius.md }}
              disabled={
                submitting ||
                currencyPickerOpen ||
                categoryDrawerOpen ||
                taxRateDrawerOpen ||
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

      <StatementCategoryDrawer
        open={open && mode === 'manual' && manualStep === 'details' && categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        categories={categories}
        selectedCategoryId={manualDraft.categoryId}
        selecting={false}
        onSelect={categoryId => {
          setManualDraft(prev => ({
            ...prev,
            categoryId,
          }));
          setCategoryDrawerOpen(false);
          setError(null);
        }}
        labels={{
          title: 'Category',
          searchPlaceholder: 'Search categories',
          allOption: 'No category',
          noResults: 'No categories found',
        }}
        width="lg"
        showAllOption={false}
      />

      <DrawerShell
        isOpen={open && mode === 'manual' && manualStep === 'details' && taxRateDrawerOpen}
        onClose={() => setTaxRateDrawerOpen(false)}
        position="right"
        width="lg"
        showCloseButton={false}
        title={
          <div className="lumio-payable-drawer__title-wrap">
            <button
              type="button"
              onClick={() => setTaxRateDrawerOpen(false)}
              className="lumio-col-drawer__back-btn"
              aria-label="Close tax rate drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
              Tax rate
            </span>
          </div>
        }
      >
        <div className="lumio-cat-drawer">
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-color, var(--border-color))',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <label
                style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--muted-foreground)' }}
              >
                <span>Tax rate name</span>
                <input
                  value={taxRateName}
                  onChange={event => setTaxRateName(event.target.value)}
                  placeholder="VAT 12%"
                  style={{
                    height: 42,
                    borderRadius: tokens.radius.sm,
                    border: '1px solid var(--border-color, var(--border-color))',
                    background: 'var(--card-bg, #fff)',
                    padding: '0 12px',
                    fontSize: 16,
                    color: 'var(--foreground)',
                  }}
                />
              </label>
              <label
                style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--muted-foreground)' }}
              >
                <span>Tax percentage</span>
                <input
                  value={taxRateValue}
                  onChange={event => setTaxRateValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="12"
                  style={{
                    height: 42,
                    borderRadius: tokens.radius.sm,
                    border: '1px solid var(--border-color, var(--border-color))',
                    background: 'var(--card-bg, #fff)',
                    padding: '0 12px',
                    fontSize: 16,
                    color: 'var(--foreground)',
                  }}
                />
              </label>
              {taxRateError ? (
                <p style={{ fontSize: 12, color: 'var(--destructive)' }}>{taxRateError}</p>
              ) : null}
              <Button
                type="button"
                disabled={taxRateSaving}
                onClick={() => void handleCreateTaxRate()}
                style={{ width: '100%', borderRadius: tokens.radius.md }}
              >
                {taxRateSaving ? 'Saving...' : 'Save tax rate'}
              </Button>
            </div>
          </div>
          <div className="lumio-cat-drawer__list">
            {enabledTaxRates.map(taxRate => {
              const isSelected = manualDraft.taxRateId
                ? manualDraft.taxRateId === taxRate.id
                : defaultTaxRate?.id === taxRate.id;

              return (
                <button
                  key={taxRate.id}
                  type="button"
                  onClick={() => {
                    setManualDraft(prev => ({
                      ...prev,
                      taxRateId: taxRate.id,
                    }));
                    setTaxRateDrawerOpen(false);
                  }}
                  className={`lumio-cat-drawer__option${isSelected ? ' lumio-cat-drawer__option--selected' : ''}`}
                >
                  <span>
                    {taxRate.name} ({Number(taxRate.rate || 0).toFixed(0)}%)
                    {taxRate.isDefault ? ' - Default' : ''}
                  </span>
                  {isSelected ? <Check size={24} style={{ color: 'var(--primary)' }} /> : null}
                </button>
              );
            })}
            {enabledTaxRates.length === 0 ? (
              <div className="lumio-cat-drawer__no-results">No tax rates found</div>
            ) : null}
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
