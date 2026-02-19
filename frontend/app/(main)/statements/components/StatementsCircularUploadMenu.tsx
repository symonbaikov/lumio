'use client';

import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
  buildStatementUploadMenuModel,
} from '@/app/lib/statement-upload-actions';
import { cn } from '@/app/lib/utils';
import { Cloud, Plus, Receipt, ScanLine } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  providers: ConnectedCloudProviders;
  onScan: () => void;
  onCloudImport: (provider: CloudImportProvider | null) => void;
  onGmail: () => void;
  onLocalUpload: () => void;
  placement?: 'panel' | 'floating';
};

const ACTION_OFFSETS = [
  { x: 28, y: -164 },
  { x: 74, y: -114 },
  { x: 122, y: -64 },
  { x: 170, y: -14 },
] as const;

const ARC_SIZES = {
  panel: {
    height: 'h-[232px]',
    width: 'w-[320px]',
    radius: 'rounded-tr-[232px]',
    buttonLeft: 'left-4',
    bottom: 'bottom-5',
    closedOffset: 'translate(16px, -6px)',
    container: '-mx-4 -mb-3 h-52',
  },
  floating: {
    height: 'h-60',
    width: 'w-[320px]',
    radius: 'rounded-tr-[240px]',
    buttonLeft: 'left-6',
    bottom: 'bottom-6',
    closedOffset: 'translate(8px, -6px)',
    container: 'h-60 w-[320px]',
  },
} as const;

export default function StatementsCircularUploadMenu({
  providers,
  onScan,
  onCloudImport,
  onGmail,
  onLocalUpload,
  placement = 'panel',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const menuItems = useMemo(() => buildStatementUploadMenuModel(providers), [providers]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-statements-fab-interactive="true"]')) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleActionClick = (
    itemId: (typeof menuItems)[number]['id'],
    provider?: CloudImportProvider,
  ) => {
    if (itemId === 'scan') {
      onScan();
      setIsOpen(false);
      return;
    }

    if (itemId === 'cloud-import') {
      onCloudImport(provider ?? null);
      setIsOpen(false);
      return;
    }

    if (itemId === 'gmail') {
      onGmail();
      setIsOpen(false);
      return;
    }

    onLocalUpload();
    setIsOpen(false);
  };

  const renderActionIcon = (item: (typeof menuItems)[number]) => {
    if (item.id === 'scan') {
      return <ScanLine size={18} className="text-primary" />;
    }

    if (item.id === 'cloud-import') {
      if (item.provider === 'dropbox') {
        return <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={18} height={18} />;
      }

      if (item.provider === 'google-drive') {
        return (
          <Image src="/icons/google-drive-icon.png" alt="Google Drive" width={18} height={18} />
        );
      }

      return <Cloud size={18} className="text-primary" />;
    }

    if (item.id === 'gmail') {
      return <Image src="/icons/gmail.png" alt="Gmail" width={18} height={18} />;
    }

    return <Receipt size={18} className="text-[#9ea6a0]" />;
  };

  const styles = ARC_SIZES[placement];

  const menu = (
    <div
      className={cn(
        'relative overflow-visible',
        styles.container,
        placement === 'floating' && 'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 bg-primary transition-all duration-300 ease-out',
          isOpen
            ? `${styles.height} ${styles.width} ${styles.radius} opacity-100`
            : 'h-0 w-0 rounded-tr-none opacity-0',
        )}
      />

      {menuItems.map((item, index) => {
        const fallbackOffset = ACTION_OFFSETS[ACTION_OFFSETS.length - 1];
        const offset = ACTION_OFFSETS[index] ?? fallbackOffset;

        return (
          <div
            key={item.id}
            className={cn(
              'absolute left-0 z-20 transition-all duration-300 ease-out',
              styles.bottom,
              isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{
              transform: isOpen ? `translate(${offset.x}px, ${offset.y}px)` : styles.closedOffset,
            }}
          >
            <button
              data-statements-fab-interactive="true"
              type="button"
              disabled={item.disabled}
              onClick={() => handleActionClick(item.id, item.provider)}
              title={item.label}
              className={cn(
                'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white transition-all duration-300 ease-out',
                item.disabled ? 'cursor-not-allowed opacity-45' : 'hover:scale-105 active:scale-95',
              )}
            >
              {renderActionIcon(item)}
              <span className="sr-only">{item.label}</span>
            </button>
            <span
              className={cn(
                'absolute left-[48px] top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold',
                item.id === 'local-upload' ? 'text-[#0f3428]' : 'text-primary',
              )}
            >
              {item.label}
            </span>
          </div>
        );
      })}

      <button
        data-statements-fab-interactive="true"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'pointer-events-auto absolute z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover',
          styles.buttonLeft,
          styles.bottom,
        )}
        aria-label="Open upload actions"
      >
        <Plus
          size={24}
          className={cn('transition-transform duration-300', isOpen ? 'rotate-45' : 'rotate-0')}
        />
      </button>
    </div>
  );

  if (placement === 'floating' && portalReady) {
    const portalTarget = document.getElementById('fab-portal') ?? document.body;
    return createPortal(
      <div className="fixed bottom-0 left-0 z-[60] pointer-events-none lg:hidden">{menu}</div>,
      portalTarget,
    );
  }

  return menu;
}
