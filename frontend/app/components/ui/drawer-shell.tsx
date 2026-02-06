'use client';

import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { cn } from '@/app/lib/utils';
import { X } from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export type DrawerPosition = 'left' | 'right';
export type DrawerWidth = 'sm' | 'md' | 'lg' | 'xl';

export interface DrawerShellProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when the drawer should close */
  onClose: () => void;
  /** Drawer title shown in header */
  title?: React.ReactNode;
  /** Drawer position */
  position?: DrawerPosition;
  /** Drawer width preset */
  width?: DrawerWidth;
  /** Drawer content */
  children: React.ReactNode;
  /** Whether to show the close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the drawer */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes the drawer */
  closeOnEscape?: boolean;
  /** Additional className for the drawer container */
  className?: string;
  /** Whether to lock body scroll when open */
  lockScroll?: boolean;
}

const widthClasses: Record<DrawerWidth, string> = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const positionClasses: Record<DrawerPosition, { container: string; open: string; closed: string }> =
  {
    left: {
      container: 'left-0 top-0 h-full border-r',
      open: 'translate-x-0',
      closed: '-translate-x-full',
    },
    right: {
      container: 'right-0 top-0 h-full border-l',
      open: 'translate-x-0',
      closed: 'translate-x-full',
    },
  };

/**
 * DrawerShell - Unified drawer/slide-out panel component
 *
 * Provides consistent styling and behavior for all drawers:
 * - Slide-in animation from left or right
 * - Backdrop overlay
 * - Body scroll lock
 * - Keyboard (ESC) support
 */
export function DrawerShell({
  isOpen,
  onClose,
  title,
  position = 'right',
  width = 'md',
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  lockScroll = true,
}: DrawerShellProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isRendered, setIsRendered] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useLockBodyScroll(isOpen && lockScroll);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsVisible(false);
      const frame = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.getBoundingClientRect();
        }
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!isOpen && isRendered) {
      setIsVisible(false);
      const timer = window.setTimeout(() => {
        setIsRendered(false);
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

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

  if (!mounted || !isRendered) return null;

  const positionConfig = positionClasses[position];

  const drawer = (
    <dialog
      className={cn(
        'fixed inset-0 z-[2000] m-0 h-screen w-screen max-h-none max-w-none border-0 bg-transparent p-0',
        isVisible ? '' : 'pointer-events-none',
      )}
      open={isRendered}
      aria-modal={isOpen}
      aria-hidden={!isOpen}
      aria-labelledby={title ? 'drawer-title' : undefined}
    >
      {/* Backdrop */}
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleBackdropClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBackdropClick();
          }
        }}
        aria-hidden="true"
        role="presentation"
      />

      {/* Drawer container */}
      <div
        className={cn(
          'fixed w-full h-full overflow-hidden bg-white shadow-2xl flex flex-col',
          'transition-transform duration-500 ease-out',
          'border-gray-200',
          positionConfig.container,
          isVisible ? positionConfig.open : positionConfig.closed,
          widthClasses[width],
          className,
        )}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="presentation"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            {title && (
              <h2 id="drawer-title" className="text-lg font-bold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'rounded-lg p-2 text-gray-400 transition',
                  'hover:bg-gray-100 hover:text-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-gray-200',
                  !title && 'ml-auto',
                )}
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex h-full flex-col">{children}</div>
      </div>
    </dialog>
  );

  return createPortal(drawer, document.body);
}
