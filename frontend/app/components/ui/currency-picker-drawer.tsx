import { Check, ChevronLeft, Search } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { CurrencySearchItem } from '@/app/lib/statement-expense-drawer';
import { tokens } from '@/lib/theme-tokens';

const CURRENCY_BTN_STYLE: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: tokens.radius.md,
  padding: '12px',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};

type CurrencyListProps = { items: CurrencySearchItem[]; onSelect: (code: string) => void };
function CurrencyList({ items, onSelect }: CurrencyListProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <p
        style={{
          borderRadius: tokens.radius.sm,
          background: 'var(--card-bg)',
          padding: '12px',
          fontSize: 14,
          color: 'var(--muted-foreground)',
        }}
      >
        No currencies found
      </p>
    );
  }
  return (
    <>
      {items.map(item => (
        <button
          key={item.code}
          type="button"
          onClick={() => onSelect(item.code)}
          style={CURRENCY_BTN_STYLE}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
            {item.label}
          </span>
        </button>
      ))}
    </>
  );
}

type SelectedCurrencyButtonProps = { item: CurrencySearchItem; onSelect: (code: string) => void };
function SelectedCurrencyButton({
  item,
  onSelect,
}: SelectedCurrencyButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.code)}
      style={{
        marginTop: 20,
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: tokens.radius.md,
        background: '#ebe8e2',
        padding: '16px',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
        {item.label}
      </span>
      <Check size={20} color="var(--primary)" />
    </button>
  );
}

type AllCurrencySectionProps = { items: CurrencySearchItem[]; onSelect: (code: string) => void };
function AllCurrencySection({ items, onSelect }: AllCurrencySectionProps): React.ReactElement {
  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ padding: '0 4px', fontSize: 14, color: 'var(--muted-foreground)' }}>All</p>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <CurrencyList items={items} onSelect={onSelect} />
      </div>
    </div>
  );
}

type RecentSectionProps = { items: CurrencySearchItem[]; onSelect: (code: string) => void };
function RecentCurrencySection({ items, onSelect }: RecentSectionProps): React.ReactElement {
  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ padding: '0 4px', fontSize: 14, color: 'var(--muted-foreground)' }}>Recents</p>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <CurrencyList items={items} onSelect={onSelect} />
      </div>
    </div>
  );
}

export interface CurrencyPickerDrawerProps {
  isOpen: boolean;
  currencySearch: string;
  selectedCurrencyItem: CurrencySearchItem | null;
  selectedMatchesSearch: boolean;
  recentCurrencyItems: CurrencySearchItem[];
  allCurrencyItems: CurrencySearchItem[];
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (code: string) => void;
}

export function CurrencyPickerDrawer({
  isOpen,
  currencySearch,
  selectedCurrencyItem,
  selectedMatchesSearch,
  recentCurrencyItems,
  allCurrencyItems,
  onSearchChange,
  onClose,
  onSelect,
}: CurrencyPickerDrawerProps): React.ReactElement {
  const currencyQuery = currencySearch.trim().toLowerCase();
  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      zIndex={1400}
      title={
        <div className="lumio-payable-drawer__title-wrap">
          <button
            type="button"
            onClick={onClose}
            className="lumio-col-drawer__back-btn"
            aria-label="Select a currency"
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
            Select a currency
          </span>
        </div>
      }
    >
      <div className="lumio-cat-drawer">
        <div className="lumio-cat-drawer__search">
          <label className="lumio-cat-drawer__search-label">
            <Search size={20} className="lumio-cat-drawer__search-icon" />
            <input
              type="text"
              value={currencySearch}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search"
              className="lumio-cat-drawer__search-input"
            />
          </label>
        </div>
        <div className="lumio-cat-drawer__list">
          {selectedCurrencyItem && selectedMatchesSearch && (
            <SelectedCurrencyButton item={selectedCurrencyItem} onSelect={onSelect} />
          )}
          {!currencyQuery && recentCurrencyItems.length > 0 && (
            <RecentCurrencySection items={recentCurrencyItems} onSelect={onSelect} />
          )}
          <AllCurrencySection items={allCurrencyItems} onSelect={onSelect} />
        </div>
      </div>
    </DrawerShell>
  );
}
