'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ImageIcon,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

const resolveBackgroundSrc = (backgroundImage: string | null) => {
  if (!backgroundImage) {
    return null;
  }

  if (
    backgroundImage.startsWith('http://') ||
    backgroundImage.startsWith('https://') ||
    backgroundImage.startsWith('/')
  ) {
    return backgroundImage;
  }

  return `/workspace-backgrounds/${backgroundImage}`;
};

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

export default function WorkspaceOverviewView() {
  const router = useRouter();
  const { currentWorkspace, refreshWorkspaces, clearWorkspace, updateWorkspaceBackground } =
    useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);

  useEffect(() => {
    if (!currentWorkspace) return;
    setName(currentWorkspace.name ?? '');
    setDescription(currentWorkspace.description ?? '');
    setCurrency(currentWorkspace.currency ?? '');
  }, [currentWorkspace]);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);

  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );

  const selectedCurrencyItem = currency ? currencyByCode.get(currency) : null;
  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== currency),
    [recentCurrencies, currencyByCode, currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== currency);
  }, [currencyItems, currencyQuery, currency]);

  const notSelectedLabel = 'Not selected';
  const notSelectedMatchesSearch =
    currencyQuery.length === 0 || notSelectedLabel.toLowerCase().includes(currencyQuery);

  const isDirty =
    Boolean(currentWorkspace) &&
    (name !== (currentWorkspace?.name ?? '') ||
      description !== (currentWorkspace?.description ?? '') ||
      currency !== (currentWorkspace?.currency ?? ''));

  const handleSave = async () => {
    if (!currentWorkspace || !name.trim()) return;

    setSaving(true);
    try {
      await apiClient.patch(`/workspaces/${currentWorkspace.id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        currency: currency || undefined,
      });
      await refreshWorkspaces();
      toast.success('Workspace updated');
    } catch (error) {
      console.error('Failed to update workspace:', error);
      toast.error('Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;

    const confirmed = window.confirm('Delete this workspace? This action cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/workspaces/${currentWorkspace.id}`);
      clearWorkspace();
      await refreshWorkspaces();
      toast.success('Workspace deleted');
      router.replace('/workspaces/list');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const pushRecentCurrency = (currencyCode: string) => {
    setRecentCurrencies(prev => [currencyCode, ...prev.filter(item => item !== currencyCode)]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    setCurrency(currencyCode);
    if (currencyCode) {
      pushRecentCurrency(currencyCode);
    }
    setCurrencySearch('');
    setCurrencyDrawerOpen(false);
  };

  const handleBackgroundChange = async (background: string) => {
    if (!currentWorkspace) return;
    setSavingBackground(true);
    try {
      await updateWorkspaceBackground(currentWorkspace.id, background);
      toast.success('Background updated');
      setShowBackgroundPicker(false);
    } catch {
      toast.error('Failed to update background');
    } finally {
      setSavingBackground(false);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="h-[calc(100vh-var(--global-nav-height,0px))] overflow-y-auto bg-background">
      <div className="container max-w-4xl px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold">
              {getInitials(currentWorkspace.name) || <Building2 size={24} />}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
              <p className="text-sm text-muted-foreground">
                Manage workspace profile, defaults, and billing details.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <ImageIcon size={16} className="text-muted-foreground" />
                Workspace background
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose a background image for your workspace card
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              disabled={savingBackground}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              Change
              <ChevronDown
                size={14}
                className={`transition-transform ${showBackgroundPicker ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          <div className="relative aspect-video max-w-xs rounded-lg overflow-hidden border border-border">
            {resolveBackgroundSrc(currentWorkspace.backgroundImage) ? (
              <img
                src={resolveBackgroundSrc(currentWorkspace.backgroundImage) || ''}
                alt="Current workspace background"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No background selected</p>
              </div>
            )}
          </div>

          {showBackgroundPicker && (
            <div className="pt-2">
              {savingBackground && <p className="text-xs text-muted-foreground mb-2">Saving...</p>}
              <BackgroundSelector
                selectedBackground={currentWorkspace.backgroundImage}
                onSelect={handleBackgroundChange}
                backgrounds={AVAILABLE_BACKGROUNDS}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="workspace-name" className="text-sm font-medium text-foreground">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="workspace-description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="workspace-currency-trigger"
              className="text-sm font-medium text-foreground"
            >
              Default currency
            </label>
            <button
              id="workspace-currency-trigger"
              data-testid="workspace-currency-trigger"
              type="button"
              onClick={() => setCurrencyDrawerOpen(true)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="truncate">{selectedCurrencyItem?.label || notSelectedLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save changes'}
            </button>

            {currentWorkspace.memberRole === 'owner' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete workspace'}
              </button>
            )}
          </div>
        </div>
      </div>

      <DrawerShell
        isOpen={currencyDrawerOpen}
        onClose={() => {
          setCurrencyDrawerOpen(false);
          setCurrencySearch('');
        }}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-[#fbfaf8] sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrencyDrawerOpen(false);
                setCurrencySearch('');
              }}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close currency drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-[#0f3428]">Select a currency</span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
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

            {!currency && notSelectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency('')}
                className="flex w-full items-center justify-between rounded-2xl bg-[#ebe8e2] px-4 py-4 text-left"
              >
                <span className="text-base font-semibold text-[#0f3428]">{notSelectedLabel}</span>
                <Check className="h-5 w-5 text-primary" />
              </button>
            ) : null}

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
                {notSelectedMatchesSearch && currency ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCurrency('')}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f1efea]"
                  >
                    <span className="text-base font-semibold text-[#0f3428]">
                      {notSelectedLabel}
                    </span>
                  </button>
                ) : null}

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
          </div>
        </div>
      </DrawerShell>
    </div>
  );
}
