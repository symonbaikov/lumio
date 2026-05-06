'use client';

import StatementCategoryDrawer from '@/app/(main)/statements/[id]/edit/StatementCategoryDrawer';
import { useExpenseForm } from '@/app/(main)/statements/components/hooks/useExpenseForm';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { type StatementCategoryNode } from '@/app/lib/statement-categories';
import {
  type ManualExpenseDraft,
  type StatementExpenseMode,
  type TaxRateOption,
  sanitizeManualAmountInput,
} from '@/app/lib/statement-expense-drawer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
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
import { useRef } from 'react';
import { tokens } from '@/lib/theme-tokens';

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
};

export default function CreateExpenseDrawer({
  open,
  initialMode,
  defaultCurrency,
  categories,
  taxRates,
  onClose,
  onSubmitScan,
  onSubmitManual,
}: Props) {
  const isMobile = useIsMobile();
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const scanGalleryInputRef = useRef<HTMLInputElement>(null);
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
    flatCategories,
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
    taxRates,
    onClose,
    onSubmitScan,
    onSubmitManual,
  });

  const currencyQuery = currencySearch.trim().toLowerCase();

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
                          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
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
                          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                            {item.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="lumio-expense-drawer__no-result">
                        No currencies found
                      </p>
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
                        background: 'var(--primary)',
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
                  <label style={{ display: 'flex', cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.lg, border: '2px dashed', borderColor: 'color-mix(in srgb, var(--primary) 40%, transparent)', background: 'rgba(0,0,0,0.04)', padding: '48px 24px', textAlign: 'center' }}>
                    <Receipt size={56} style={{ color: 'var(--muted-foreground)' }} />
                    <p style={{ marginTop: 24, fontSize: 30, fontWeight: 600, lineHeight: 1, color: 'var(--foreground)' }}>
                      Upload receipts
                    </p>
                    <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted-foreground)' }}>or drag and drop them here</p>
                    <span style={{ marginTop: 24, display: 'inline-flex', borderRadius: tokens.radius.md, background: 'var(--primary)', padding: '10px 28px', fontSize: 14, fontWeight: 600, color: '#fff' }}>
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
              <div style={{ display: 'flex', minHeight: '100%', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <label htmlFor="expense-manual-amount" className="sr-only">
                    Amount
                  </label>
                  <div style={{ margin: '0 auto', width: 290, maxWidth: '100%' }}>
                    <div style={{ display: 'flex', height: 96, width: '100%', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
                      <span
                        style={{ flexShrink: 0, lineHeight: 1, fontWeight: 600, color: 'var(--foreground)', fontSize: manualAmountFontSize }}
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
                        style={{ minWidth: 0, flex: 1, border: 0, background: 'transparent', padding: 0, lineHeight: 1, fontWeight: 600, color: 'var(--foreground)', fontSize: manualAmountFontSize }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrencyPickerOpen(true)}
                      style={{ marginTop: 48, display: 'inline-flex', height: 64, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: tokens.radius.md, border: '1px solid var(--border-color, var(--border-color))', background: 'var(--muted)', padding: '0 24px', fontSize: 18, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}
                    >
                      {manualDraft.currency}
                      <ChevronDown size={20} style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label style={{ position: 'relative', display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.lg, border: '1px solid var(--border-color, var(--border-color))', background: 'rgba(0,0,0,0.04)', padding: '32px 24px', textAlign: 'center' }}>
                  <FileText size={56} style={{ color: 'color-mix(in srgb, var(--muted-foreground) 60%, transparent)' }} />
                  <span style={{ position: 'absolute', left: '50%', top: '50%', display: 'flex', height: 40, width: 40, transform: 'translate(8px, 4px)', alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.full, background: 'var(--primary)', color: '#fff' }}>
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

                <div style={{ overflow: 'hidden', borderRadius: tokens.radius.lg, border: '1px solid var(--border-color, var(--border-color))', background: 'var(--card-bg, #fff)' }}>
                  <button
                    type="button"
                    onClick={() => setManualStep('amount')}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <div>
                      <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Amount</p>
                      <p style={{ marginTop: 4, fontSize: 30, lineHeight: 1, fontWeight: 600, color: 'var(--foreground)' }}>
                        {selectedCurrencySymbol}
                        {manualDraft.amount || '0.00'}
                      </p>
                    </div>
                    <ChevronRight size={24} style={{ color: 'var(--muted-foreground)' }} />
                  </button>

                  <div style={{ height: 1, background: 'var(--border-color, var(--border-color))' }} />

                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label
                        htmlFor="expense-manual-description"
                        style={{ fontSize: 14, color: 'var(--muted-foreground)' }}
                      >
                        Description
                      </label>
                      <ChevronRight size={24} style={{ color: 'var(--muted-foreground)' }} />
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
                      style={{ marginTop: 6, width: '100%', border: 0, background: 'transparent', padding: 0, fontSize: 24, lineHeight: 1, color: 'var(--foreground)' }}
                    />
                  </div>

                  <div style={{ height: 1, background: 'var(--border-color, var(--border-color))' }} />

                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label
                        htmlFor="expense-manual-merchant"
                        style={{ fontSize: 14, color: 'var(--muted-foreground)' }}
                      >
                        Merchant
                      </label>
                      <ChevronRight size={24} style={{ color: 'var(--muted-foreground)' }} />
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
                      style={{ marginTop: 6, width: '100%', border: 0, background: 'transparent', padding: 0, fontSize: 24, lineHeight: 1, color: 'var(--foreground)' }}
                    />
                    {!manualValidation.merchant ? (
                      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--destructive)' }}>This field is required</p>
                    ) : null}
                  </div>

                  <div style={{ height: 1, background: 'var(--border-color, var(--border-color))' }} />

                  <button
                    type="button"
                    onClick={() => setCategoryDrawerOpen(true)}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Category</p>
                      <p style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 24, lineHeight: 1, color: 'var(--foreground)' }}>
                        {selectedCategoryName || 'Required'}
                      </p>
                      {!manualValidation.category ? (
                        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--destructive)' }}>This field is required</p>
                      ) : null}
                    </div>
                    <ChevronRight size={24} style={{ color: 'var(--muted-foreground)' }} />
                  </button>

                  <div style={{ height: 1, background: 'var(--border-color, var(--border-color))' }} />

                  <div style={{ padding: '12px 16px' }}>
                    <DatePicker
                      label="Date"
                      value={manualDate ? parseISO(manualDate) : null}
                      onChange={(d: Date | null) => setManualDate(d && isValid(d) ? format(d, 'yyyy-MM-dd') : '')}
                      slotProps={{ textField: { size: 'small', fullWidth: true } as never }}
                    />
                  </div>

                  <div style={{ height: 1, background: 'var(--border-color, var(--border-color))' }} />

                  <button
                    type="button"
                    onClick={() => setTaxRateDrawerOpen(true)}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Tax</p>
                      <p style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 24, lineHeight: 1, color: 'var(--foreground)' }}>
                        {selectedTaxRate
                          ? `${selectedTaxRate.name} (${Number(selectedTaxRate.rate || 0).toFixed(0)}%)${selectedTaxRate.isDefault ? ' - Default' : ''}`
                          : 'Optional'}
                      </p>
                    </div>
                    <ChevronRight size={24} style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                </div>
              </>
            )}

            {files.length > 0 && !currencyPickerOpen ? (
              <div style={{ borderRadius: tokens.radius.lg, border: '1px solid var(--border-color, var(--border-color))', background: 'var(--card-bg, #fff)', padding: '12px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>
                  Selected files
                </p>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map(file => (
                    <div
                      key={`${file.name}-${file.size}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: tokens.radius.sm, border: '1px solid var(--border-color, var(--border-color))', padding: '8px 12px', fontSize: 14 }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--foreground)' }}>{file.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div style={{ borderRadius: tokens.radius.sm, border: '1px solid #fecaca', background: 'var(--color-error-soft-bg)', padding: '8px 12px', fontSize: 14, color: 'var(--destructive)' }}>
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
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Tax rate</span>
          </div>
        }
      >
        <div className="lumio-cat-drawer">
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
