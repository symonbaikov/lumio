'use client';

import Image from 'next/image';
import { Cloud, Plus, ScanLine, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/app/lib/utils';
import {
  buildStatementUploadMenuModel,
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';

type Props = {
  providers: ConnectedCloudProviders;
  onScan: () => void;
  onCloudImport: (provider: CloudImportProvider | null) => void;
  onLocalUpload: () => void;
};

const ACTION_OFFSETS = [
  { x: 34, y: -102 },
  { x: 88, y: -60 },
  { x: 116, y: -8 },
] as const;

export default function StatementsCircularUploadMenu({
  providers,
  onScan,
  onCloudImport,
  onLocalUpload,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItems = useMemo(() => buildStatementUploadMenuModel(providers), [providers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

    onLocalUpload();
    setIsOpen(false);
  };

  const renderActionIcon = (item: (typeof menuItems)[number]) => {
    if (item.id === 'scan') {
      return <ScanLine size={18} className="text-[#0E58A8]" />;
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

      return <Cloud size={18} className="text-[#0E58A8]" />;
    }

    return <UploadCloud size={18} className="text-[#0E58A8]" />;
  };

  return (
    <div ref={menuRef} className="relative -mx-4 -mb-3 h-44 overflow-visible">
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 bg-[#0E58A8] transition-all duration-300 ease-out',
          isOpen
            ? 'h-[176px] w-[218px] rounded-tr-[176px] opacity-100'
            : 'h-0 w-0 rounded-tr-[0px] opacity-0',
        )}
      />

      {menuItems.map((item, index) => {
        const offset = ACTION_OFFSETS[index];

        return (
          <div
            key={item.id}
            className={cn(
              'absolute left-0 bottom-3 z-20 transition-all duration-300 ease-out',
              isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{
              transform: isOpen
                ? `translate(${offset.x}px, ${offset.y}px)`
                : 'translate(18px, -8px)',
            }}
          >
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => handleActionClick(item.id, item.provider)}
              title={item.label}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white transition-all duration-300 ease-out',
                item.disabled ? 'cursor-not-allowed opacity-45' : 'hover:scale-105 active:scale-95',
              )}
            >
              {renderActionIcon(item)}
              <span className="sr-only">{item.label}</span>
            </button>
            <span className="absolute left-[48px] top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0E58A8]">
              {item.label}
            </span>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="absolute bottom-3 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#0E58A8] text-white transition hover:bg-[#0B4A8D]"
        aria-label="Open upload actions"
      >
        <Plus
          size={24}
          className={cn('transition-transform duration-300', isOpen ? 'rotate-45' : 'rotate-0')}
        />
      </button>
    </div>
  );
}
