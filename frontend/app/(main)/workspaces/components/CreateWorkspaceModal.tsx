'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { api } from '@/app/lib/api';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';
import { Button, Input, Textarea } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';
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
    return () => {};
  }, [isOpen]);

  // Emoji picker removed — no-op effect kept intentionally for compatibility
  useEffect(() => {
    // feature removed: icons/emoji selection is disabled
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={next => {
        if (!next) {
          handleClose();
        }
      }}
      size="5xl"
      placement="center"
      backdrop="opaque"
      scrollBehavior="inside"
      classNames={{
        base: 'rounded-2xl border border-gray-200 shadow-xl',
        backdrop: 'bg-gray-900/40 backdrop-blur-[1px]',
        closeButton:
          'text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors',
      }}
    >
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className="flex flex-col gap-3 border-b border-gray-200 px-8 py-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Workspace setup
              </div>
              <div>
                <h2 id={dialogTitleId} className="text-2xl font-semibold text-gray-900">
                  Create New Workspace
                </h2>
                <p className="text-sm text-gray-500">
                  Create a dedicated space for your documents, receipts, and reports.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-400">Step {step} of 3</div>
                <nav aria-label="Workspace setup steps" className="flex flex-wrap gap-2">
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
                    <div
                      key={item.id}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        item.id === step
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-500'
                      }`}
                      aria-current={item.id === step ? 'step' : undefined}
                    >
                      {item.label}
                    </div>
                  ))}
                </nav>
              </div>
            </ModalHeader>

            <ModalBody className="px-8 py-8">
              {step === 1 && (
                <div className="space-y-6">
                  <Input
                    label="Workspace Name"
                    isRequired
                    value={name}
                    onValueChange={setName}
                    placeholder="My Workspace"
                    maxLength={255}
                  />
                  <Textarea
                    label="Description (optional)"
                    value={description}
                    onValueChange={setDescription}
                    placeholder="What is this workspace for?"
                    maxLength={500}
                    minRows={4}
                  />
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
            </ModalBody>

            <ModalFooter className="flex items-center justify-between gap-3 border-t border-gray-200 px-8 py-6">
              {step > 1 ? (
                <Button type="button" variant="bordered" onClick={handleBack}>
                  <ChevronLeft size={16} />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step === 1 && (
                <Button type="button" color="primary" onClick={handleNext}>
                  Next
                  <ChevronRight size={16} />
                </Button>
              )}

              {step === 2 && (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="bordered"
                    onClick={handleFinishFromStep2}
                    isDisabled={loading}
                  >
                    {loading ? 'Creating...' : 'Skip Integrations'}
                  </Button>
                  <Button
                    type="button"
                    color="primary"
                    onClick={handleProceedToStep3}
                    isDisabled={loading}
                  >
                    {loading ? 'Creating...' : 'Next'}
                    {!loading && <ChevronRight size={16} />}
                  </Button>
                </div>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
