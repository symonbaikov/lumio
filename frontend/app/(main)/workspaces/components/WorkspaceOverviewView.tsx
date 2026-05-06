'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ImageIcon,
  Save,
  Search,
  Trash2,
} from '@/app/components/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';
import { tokens } from '@/lib/theme-tokens';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
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

  const isDeleteConfirmationMatched =
    deleteConfirmationName.trim() === (currentWorkspace?.name ?? '');

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
    } catch (err) {
      console.error('Failed to update workspace:', err);
      toast.error('Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;
    if (!isDeleteConfirmationMatched) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/workspaces/${currentWorkspace.id}`);
      clearWorkspace();
      await refreshWorkspaces();
      toast.success('Workspace deleted');
      setDeleteModalOpen(false);
      setDeleteConfirmationName('');
      router.replace('/workspaces/list');
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      toast.error('Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationName('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteConfirmationName('');
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
    <Box
      sx={{
        height: 'calc(100vh - var(--global-nav-height, 0px))',
        overflowY: 'auto',
        bgcolor: 'var(--background)',
      }}
    >
      <Box
        sx={{ maxWidth: 1024, px: { xs: 2.5, sm: 3 }, py: 2 }}
        data-tour-id="workspace-side-panel"
      >
        {/* Header card */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 2, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: tokens.radius.sm,
                bgcolor: 'rgba(var(--primary-rgb,22,129,24),0.1)',
                color: 'var(--primary)',
                fontSize: 18,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getInitials(currentWorkspace.name) || <Building2 size={24} />}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                Overview
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
                Manage workspace profile, defaults, and billing details.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Background section */}
        <Box
          sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 2, mb: 1.5 }}
          data-tour-id="workspace-background"
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { sm: 'flex-start' },
              justifyContent: { sm: 'space-between' },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ImageIcon size={15} style={{ color: 'var(--muted-foreground)' }} />
                <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--foreground)' }}>
                  Workspace background
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
                Choose a background image for your workspace card
              </Typography>
            </Box>
            <button
              type="button"
              data-testid="workspace-background-trigger"
              onClick={() => setShowBackgroundPicker(true)}
              disabled={savingBackground}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                alignSelf: 'flex-start',
                border: '1px solid var(--border)',
                background: 'none',
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--foreground)',
                cursor: 'pointer',
                borderRadius: tokens.radius.md,
                opacity: savingBackground ? 0.6 : 1,
              }}
            >
              Change
              <ChevronDown size={14} />
            </button>
          </Box>

          <Box
            sx={{
              position: 'relative',
              aspectRatio: '2.8/1',
              width: '100%',
              maxWidth: 320,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              borderRadius: tokens.radius.md,
            }}
          >
            {resolveBackgroundSrc(currentWorkspace.backgroundImage) ? (
              <img
                src={resolveBackgroundSrc(currentWorkspace.backgroundImage) || ''}
                alt="Current workspace background"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  bgcolor: 'var(--muted)',
                  px: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
                  No background selected
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Settings section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ border: '1px solid var(--border)', borderRadius: tokens.radius.lg, bgcolor: 'var(--card)', p: 2 }}>
            {/* Workspace name */}
            <Box sx={{ mb: 1.5 }}>
              <label
                htmlFor="workspace-name"
                style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}
              >
                Workspace name
              </label>
              <input
                id="workspace-name"
                data-tour-id="workspace-name"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--foreground)',
                  borderRadius: tokens.radius.md,
                  boxSizing: 'border-box',
                }}
              />
            </Box>

            {/* Description */}
            <Box sx={{ mb: 1.5 }}>
              <label
                htmlFor="workspace-description"
                style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}
              >
                Description
              </label>
              <textarea
                id="workspace-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  minHeight: 80,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--foreground)',
                  borderRadius: tokens.radius.md,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </Box>

            {/* Currency */}
            <Box sx={{ mb: 1.5 }}>
              <label
                htmlFor="workspace-currency-trigger"
                style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}
              >
                Default currency
              </label>
              <button
                id="workspace-currency-trigger"
                data-testid="workspace-currency-trigger"
                data-tour-id="workspace-currency"
                type="button"
                onClick={() => setCurrencyDrawerOpen(true)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.md,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedCurrencyItem?.label || notSelectedLabel}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              </button>
            </Box>

            {/* Save button */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, pt: 0.5 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#fff',
                  cursor: !isDirty || saving ? 'not-allowed' : 'pointer',
                  borderRadius: tokens.radius.md,
                  opacity: !isDirty || saving ? 0.6 : 1,
                }}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              {isDirty && (
                <Typography variant="body2" fontWeight={500} sx={{ color: '#d97706' }}>
                  Unsaved changes
                </Typography>
              )}
            </Box>
          </Box>

          {/* Danger zone */}
          {currentWorkspace.memberRole === 'owner' && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'var(--color-error-soft-border)',
                borderRadius: tokens.radius.lg,
                bgcolor: 'var(--color-error-soft-bg)',
                p: 2,
              }}
            >
              <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--destructive)', mb: 0.5 }}>
                Danger Zone
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--destructive)', display: 'block', mb: 1.5 }}>
                This will permanently delete the workspace and all related data. This action cannot
                be undone.
              </Typography>
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'var(--card-bg)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--destructive)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  borderRadius: tokens.radius.md,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete workspace'}
              </button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Background picker drawer */}
      <DrawerShell
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        position="right"
        width="lg"
        showCloseButton={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <button
              type="button"
              onClick={() => setShowBackgroundPicker(false)}
              style={{ borderRadius: tokens.radius.full, padding: 8, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Close background drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
              Select workspace background
            </Typography>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
            <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', mb: 1.5 }}>
              Choose the image shown on your workspace card.
            </Typography>
            {savingBackground && (
              <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>
                Saving...
              </Typography>
            )}
            <BackgroundSelector
              selectedBackground={currentWorkspace.backgroundImage}
              onSelect={handleBackgroundChange}
              backgrounds={AVAILABLE_BACKGROUNDS}
            />
          </Box>
        </Box>
      </DrawerShell>

      {/* Currency drawer */}
      <DrawerShell
        isOpen={currencyDrawerOpen}
        onClose={() => {
          setCurrencyDrawerOpen(false);
          setCurrencySearch('');
        }}
        position="right"
        width="lg"
        showCloseButton={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <button
              type="button"
              onClick={() => {
                setCurrencyDrawerOpen(false);
                setCurrencySearch('');
              }}
              style={{ borderRadius: tokens.radius.full, padding: 8, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Close currency drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
              Select a currency
            </Typography>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
            {/* Search input */}
            <Box sx={{ position: 'relative', mb: 1.5 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={currencySearch}
                onChange={event => setCurrencySearch(event.target.value)}
                placeholder="Search"
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  padding: '10px 16px 10px 40px',
                  fontSize: 14,
                  color: 'var(--foreground)',
                  borderRadius: tokens.radius.md,
                  boxSizing: 'border-box',
                }}
              />
            </Box>

            {/* Not-selected option */}
            {!currency && notSelectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency('')}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--muted)',
                  border: 'none',
                  padding: '16px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.md,
                  marginBottom: 8,
                }}
              >
                <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                  {notSelectedLabel}
                </Typography>
                <Check size={20} style={{ color: 'var(--primary)' }} />
              </button>
            ) : null}

            {/* Selected currency */}
            {selectedCurrencyItem && selectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--muted)',
                  border: 'none',
                  padding: '16px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.md,
                  marginBottom: 8,
                }}
              >
                <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                  {selectedCurrencyItem.label}
                </Typography>
                <Check size={20} style={{ color: 'var(--primary)' }} />
              </button>
            ) : null}

            {/* Recents */}
            {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', px: 0.5, mb: 1 }}>
                  Recents
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentCurrencyItems.map(item => (
                    <button
                      key={`recent-${item.code}`}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        padding: '12px',
                        cursor: 'pointer',
                        borderRadius: tokens.radius.md,
                        textAlign: 'left',
                      }}
                    >
                      <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                        {item.label}
                      </Typography>
                    </button>
                  ))}
                </Box>
              </Box>
            ) : null}

            {/* All currencies */}
            <Box>
              <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', px: 0.5, mb: 1 }}>
                All
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {notSelectedMatchesSearch && currency ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCurrency('')}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      padding: '12px',
                      cursor: 'pointer',
                      borderRadius: tokens.radius.md,
                      textAlign: 'left',
                    }}
                  >
                    <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                      {notSelectedLabel}
                    </Typography>
                  </button>
                ) : null}

                {allCurrencyItems.length > 0 ? (
                  allCurrencyItems.map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        padding: '12px',
                        cursor: 'pointer',
                        borderRadius: tokens.radius.md,
                        textAlign: 'left',
                      }}
                    >
                      <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                        {item.label}
                      </Typography>
                    </button>
                  ))
                ) : (
                  <Box sx={{ bgcolor: 'var(--muted)', borderRadius: tokens.radius.md, p: 1.5 }}>
                    <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
                      No currencies found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </DrawerShell>

      {/* Delete modal */}
      <ModalShell
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        size="sm"
        closeOnBackdropClick={!deleting}
        closeOnEscape={!deleting}
        title="Delete workspace?"
        paperSx={{ borderRadius: tokens.radius.xl, border: '1px solid var(--border)', bgcolor: 'var(--card)', boxShadow: 24 }}
        footer={
          <ModalFooter
            onCancel={closeDeleteModal}
            onConfirm={handleDelete}
            cancelText="Cancel"
            confirmText={deleting ? 'Deleting...' : 'Delete'}
            confirmVariant="destructive"
            isConfirmLoading={deleting}
            isConfirmDisabled={!isDeleteConfirmationMatched || deleting}
          />
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ lineHeight: 1.75, color: 'var(--muted-foreground)' }}>
            This will permanently delete the workspace and all related data. Type the workspace name
            to confirm deletion.
          </Typography>
          <Box>
            <label
              htmlFor="delete-workspace-name"
              style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}
            >
              Workspace name
            </label>
            <input
              id="delete-workspace-name"
              type="text"
              value={deleteConfirmationName}
              onChange={event => setDeleteConfirmationName(event.target.value)}
              placeholder={currentWorkspace.name}
              autoComplete="off"
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--foreground)',
                borderRadius: tokens.radius.md,
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Box>
      </ModalShell>
    </Box>
  );
}
