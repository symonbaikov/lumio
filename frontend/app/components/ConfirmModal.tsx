'use client';

import { useIntlayer } from '@/app/i18n';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { ModalFooter, ModalShell } from './ui/modal-shell';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  isLoading = false,
}: ConfirmModalProps) {
  const t = useIntlayer('confirmModal');

  const resolvedConfirmText = confirmText ?? t.buttons.confirm.value;
  const resolvedCancelText = cancelText ?? t.buttons.cancel.value;

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={true}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      title={
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
          >
            <AlertTriangle size={20} />
          </div>
          <span>{title}</span>
        </div>
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleConfirm}
          cancelText={resolvedCancelText}
          confirmText={resolvedConfirmText}
          confirmVariant={isDestructive ? 'destructive' : 'primary'}
          isConfirmLoading={isLoading}
          isConfirmDisabled={isLoading}
        />
      }
    >
      {typeof message === 'string' ? (
        <p className="text-gray-600 leading-relaxed">{message}</p>
      ) : (
        message
      )}
    </ModalShell>
  );
}
