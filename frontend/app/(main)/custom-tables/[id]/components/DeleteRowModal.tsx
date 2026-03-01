import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { cn } from '@/app/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface DeleteRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText: string;
  cancelText: string;
  isLoading?: boolean;
}

export function DeleteRowModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
}: DeleteRowModalProps) {
  const [mounted, setMounted] = useState(false);
  useLockBodyScroll(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && !isLoading && e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 sm:px-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={isLoading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className={cn(
              'relative flex w-full max-w-sm flex-col overflow-hidden rounded-[24px]',
              'bg-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-200/50',
            )}
          >
            {/* Header section with icon directly aligned with title */}
            <div className="flex items-start justify-between p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 ring-4 ring-red-50/50">
                  <AlertCircle className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-1 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="px-[5.5rem] pb-8 pt-2">
              <div className="text-[15px] leading-relaxed text-slate-500">{message}</div>
            </div>

            {/* Footer buttons separated by subtle divider above if needed, but modern way is clean */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6 pt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:pointer-events-none disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  if (!isLoading) onClose();
                }}
                disabled={isLoading}
                className="group relative flex items-center justify-center overflow-hidden rounded-full bg-red-600 px-6 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:pointer-events-none disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">{confirmText}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
