'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { api } from '@/app/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';
import { CurrencySelector } from './CurrencySelector';
import { ServiceIntegrationSuggestions } from './ServiceIntegrationSuggestions';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();
  const dialogTitleId = useId();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(
    AVAILABLE_BACKGROUNDS[0],
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreateWorkspace = async () => {
    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        backgroundImage: selectedBackground,
        currency: selectedCurrency,
      };
      // Do not send icon — icons/emoji feature removed
      const response = await api.post('/workspaces', payload);

      setCreatedWorkspaceId(response.data.id);
      toast.success('Workspace created successfully');
      return response.data.id;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create workspace');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleFinishFromStep2 = async () => {
    try {
      const workspaceId = await handleCreateWorkspace();
      if (workspaceId) {
        await switchWorkspace(workspaceId);
        await refreshWorkspaces();
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (error) {
      // Error already handled in handleCreateWorkspace
    }
  };

  const handleProceedToStep3 = async () => {
    try {
      const workspaceId = await handleCreateWorkspace();
      if (workspaceId) {
        await switchWorkspace(workspaceId);
        await refreshWorkspaces();
        setStep(3);
      }
    } catch (error) {
      // Error already handled in handleCreateWorkspace
    }
  };

  const handleSkipIntegrations = async () => {
    resetForm();
    onSuccess();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedIcon(null);
    setSelectedBackground(AVAILABLE_BACKGROUNDS[0]);
    setSelectedCurrency(null);
    setCreatedWorkspaceId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Emoji picker removed — no-op effect kept intentionally for compatibility
  useEffect(() => {
    // feature removed: icons/emoji selection is disabled
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <dialog
        open
        className="m-0 h-full w-full border-0 bg-transparent p-0"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        data-testid="workspace-modal-shell"
      >
        <div className="flex h-full w-full items-center justify-center bg-primary/10 p-6">
          <div className="flex h-full w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <aside
              className="flex w-full max-w-sm flex-col justify-between border-r border-primary/10 bg-linear-to-br from-primary/10 via-white to-white p-8"
              data-testid="workspace-step-rail"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Workspace setup
                  </p>
                  <h2 id={dialogTitleId} className="text-2xl font-semibold text-gray-900">
                    Create New Workspace
                  </h2>
                  <p className="text-sm text-gray-500">
                    Create a dedicated space for your documents, receipts, and reports.
                  </p>
                </div>
                <nav aria-label="Workspace setup steps">
                  <ol className="space-y-4">
                    {[
                      {
                        id: 1,
                        label: 'Basic Info',
                        detail: 'Name, description, icon',
                      },
                      {
                        id: 2,
                        label: 'Customization',
                        detail: 'Currency and background',
                      },
                      {
                        id: 3,
                        label: 'Integrations',
                        detail: 'Connect services',
                      },
                    ].map(item => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition"
                        aria-current={item.id === step ? 'step' : undefined}
                      >
                        <div
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            item.id <= step ? 'bg-primary' : 'bg-gray-200'
                          }`}
                        />
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              item.id === step ? 'text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-400">{item.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white/80 p-4 text-xs text-gray-500">
                Tip: You can always edit workspace settings later in the workspace settings page.
              </div>
            </aside>
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-8">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">Step {step} of 3</div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                    aria-label="Close create workspace dialog"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-8 flex-1">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label
                          htmlFor="workspace-name"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Workspace Name *
                        </label>
                        <input
                          id="workspace-name"
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="My Workspace"
                          maxLength={255}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="workspace-description"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Description (optional)
                        </label>
                        <textarea
                          id="workspace-description"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="What is this workspace for?"
                          maxLength={500}
                          rows={4}
                        />
                      </div>

                      {/* Icon selection removed — feature not used. */}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                      <CurrencySelector
                        selectedCurrency={selectedCurrency}
                        onSelect={setSelectedCurrency}
                      />

                      <div>
                        <p className="mb-3 text-sm font-medium text-gray-700">Background Image</p>
                        <BackgroundSelector
                          selectedBackground={selectedBackground}
                          onSelect={setSelectedBackground}
                          backgrounds={AVAILABLE_BACKGROUNDS}
                        />
                      </div>
                    </div>
                  )}

                  {step === 3 && createdWorkspaceId && (
                    <ServiceIntegrationSuggestions
                      workspaceId={createdWorkspaceId}
                      onSkip={handleSkipIntegrations}
                    />
                  )}
                </div>

                <div className="mt-10 flex items-center justify-between">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                    >
                      <ChevronLeft size={16} />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step === 1 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  )}

                  {step === 2 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleFinishFromStep2}
                        disabled={loading}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                      >
                        {loading ? 'Creating...' : 'Skip Integrations'}
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedToStep3}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                      >
                        {loading ? 'Creating...' : 'Next'}
                        {!loading && <ChevronRight size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
