'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { Building2, ChevronDown, ImageIcon, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';

const CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB', 'GBP'];

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

  useEffect(() => {
    if (!currentWorkspace) return;
    setName(currentWorkspace.name ?? '');
    setDescription(currentWorkspace.description ?? '');
    setCurrency(currentWorkspace.currency ?? '');
  }, [currentWorkspace]);

  const companyAddress = useMemo(() => {
    const value = currentWorkspace?.settings?.companyAddress;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Not specified';
  }, [currentWorkspace?.settings]);

  const planType = useMemo(() => {
    const value = currentWorkspace?.settings?.planType;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Free';
  }, [currentWorkspace?.settings]);

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
              {currentWorkspace.icon || getInitials(currentWorkspace.name) || (
                <Building2 size={24} />
              )}
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
            {currentWorkspace.backgroundImage ? (
              <img
                src={`/workspace-backgrounds/${currentWorkspace.backgroundImage}`}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="workspace-currency" className="text-sm font-medium text-foreground">
                Default currency
              </label>
              <select
                id="workspace-currency"
                value={currency}
                onChange={event => setCurrency(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Not selected</option>
                {CURRENCIES.map(currencyCode => (
                  <option key={currencyCode} value={currencyCode}>
                    {currencyCode}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Plan type</p>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                {planType}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Company address</p>
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {companyAddress}
            </div>
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
    </div>
  );
}
