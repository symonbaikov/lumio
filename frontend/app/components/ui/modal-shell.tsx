'use client';

import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { cn } from '@/app/lib/utils';
import { X } from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalShellProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title shown in header */
  title?: React.ReactNode;
  /** Modal size preset */
  size?: ModalSize;
  /** Modal content */
  children: React.ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: React.ReactNode;
  /** Whether to show the close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes the modal */
  closeOnEscape?: boolean;
  /** Additional className for the modal container */
  className?: string;
  /** Additional className for the content wrapper */
  contentClassName?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[90vh]',
};

/**
 * ModalShell - Unified modal wrapper component
 *
 * Provides consistent styling, animations, and behavior for all modals:
 * - Backdrop overlay
 * - Fade-in/zoom-in animations
 * - Body scroll lock
 * - Keyboard (ESC) support
 * - Focus management
 */
export function ModalShell({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  contentClassName,
}: ModalShellProps) {
  const [mounted, setMounted] = React.useState(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdropClick) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  if (!isOpen || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4"
      // biome-ignore lint/a11y/useSemanticElements: using div for styling control
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBackdropClick();
          }
        }}
        aria-hidden="true"
        role="presentation"
      />

      {/* Modal container */}
      <div
        className={cn(
          'relative flex flex-col bg-white shadow-2xl animate-in zoom-in-95 duration-200 focus:outline-none',
          sizeClasses[size],
          className,
        )}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="presentation"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900',
                  'rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200',
                  !title && 'ml-auto',
                )}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('p-4 md:p-5', contentClassName)}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end p-4 md:p-5 border-t border-gray-100 gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * ModalHeader - Optional component for custom modal headers
 */
export function ModalHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex items-center gap-3', className)}>{children}</div>;
}

/**
 * ModalFooter - Pre-styled footer with cancel/confirm buttons pattern
 */
export interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'destructive';
  isConfirmLoading?: boolean;
  isConfirmDisabled?: boolean;
  children?: React.ReactNode;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Отмена',
  confirmText = 'Подтвердить',
  confirmVariant = 'primary',
  isConfirmLoading = false,
  isConfirmDisabled = false,
  children,
}: ModalFooterProps) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 text-sm font-medium text-gray-700 bg-white rounded-full border border-gray-300 hover:bg-gray-50 focus:ring-4 focus:outline-none focus:ring-gray-200 transition-colors"
        >
          {cancelText}
        </button>
      )}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirmDisabled || isConfirmLoading}
          className={cn(
            'py-2 px-4 text-sm font-medium text-white rounded-full focus:ring-4 focus:outline-none transition-colors shadow-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            confirmVariant === 'destructive'
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
          )}
        >
          {isConfirmLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              {confirmText}
            </span>
          ) : (
            confirmText
          )}
        </button>
      )}
    </>
  );
}
