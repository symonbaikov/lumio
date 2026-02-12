'use client';

import { cn } from '@/app/lib/utils';
import { FileSpreadsheet, Plus, Table as TableIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = {
  onCreateEmpty: () => void;
  onImportFromStatement: () => void;
  onImportGoogleSheets: () => void;
  placement?: 'panel' | 'floating';
  labels?: {
    importGoogleSheets: string;
    fromStatement: string;
    createTable: string;
    openMenu: string;
  };
};

const ACTION_OFFSETS = [
  { x: 32, y: -118 },
  { x: 82, y: -68 },
  { x: 132, y: -18 },
] as const;

const ARC_SIZES = {
  panel: {
    height: 'h-[184px]',
    width: 'w-[220px]',
    radius: 'rounded-tr-[184px]',
    buttonLeft: 'left-4',
    bottom: 'bottom-3',
    closedOffset: 'translate(16px, -6px)',
    container: '-mx-4 -mb-3 h-48',
  },
  floating: {
    height: 'h-[184px]',
    width: 'w-[220px]',
    radius: 'rounded-tr-[184px]',
    buttonLeft: 'left-0',
    bottom: 'bottom-0',
    closedOffset: 'translate(2px, -6px)',
    container: 'h-48 w-[220px]',
  },
} as const;

export default function CustomTablesCircularMenu({
  onCreateEmpty,
  onImportFromStatement,
  onImportGoogleSheets,
  placement = 'panel',
  labels,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-custom-tables-fab-interactive="true"]')) {
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

  const styles = ARC_SIZES[placement];
  const text = {
    importGoogleSheets: labels?.importGoogleSheets ?? 'Google Sheets',
    fromStatement: labels?.fromStatement ?? 'From statement',
    createTable: labels?.createTable ?? 'Create table',
    openMenu: labels?.openMenu ?? 'Open table actions',
  };

  return (
    <div className={cn('relative overflow-visible', styles.container)}>
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 bg-[#0E58A8] transition-all duration-300 ease-out',
          isOpen
            ? `${styles.height} ${styles.width} ${styles.radius} opacity-100`
            : 'h-0 w-0 rounded-tr-none opacity-0',
        )}
      />

      <div
        className={cn(
          'absolute left-0 z-20 transition-all duration-300 ease-out',
          styles.bottom,
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[0].x}px, ${ACTION_OFFSETS[0].y}px)`
            : styles.closedOffset,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onImportGoogleSheets();
            setIsOpen(false);
          }}
          title={text.importGoogleSheets}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white transition-all duration-300 ease-out hover:scale-105 active:scale-95"
        >
          <Image
            src="/icons/icons8-google-sheets-48.png"
            alt="Google Sheets"
            width={18}
            height={18}
          />
          <span className="sr-only">{text.importGoogleSheets}</span>
        </button>
        <span className="absolute left-[48px] top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0E58A8]">
          {text.importGoogleSheets}
        </span>
      </div>

      <div
        className={cn(
          'absolute left-0 z-20 transition-all duration-300 ease-out',
          styles.bottom,
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[1].x}px, ${ACTION_OFFSETS[1].y}px)`
            : styles.closedOffset,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onImportFromStatement();
            setIsOpen(false);
          }}
          title={text.fromStatement}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white transition-all duration-300 ease-out hover:scale-105 active:scale-95"
        >
          <FileSpreadsheet size={18} className="text-[#0E58A8]" />
          <span className="sr-only">{text.fromStatement}</span>
        </button>
        <span className="absolute left-[48px] top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0E58A8]">
          {text.fromStatement}
        </span>
      </div>

      <div
        className={cn(
          'absolute left-0 z-20 transition-all duration-300 ease-out',
          styles.bottom,
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[2].x}px, ${ACTION_OFFSETS[2].y}px)`
            : styles.closedOffset,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onCreateEmpty();
            setIsOpen(false);
          }}
          title={text.createTable}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white transition-all duration-300 ease-out hover:scale-105 active:scale-95"
        >
          <TableIcon size={18} className="text-[#0E58A8]" />
          <span className="sr-only">{text.createTable}</span>
        </button>
        <span className="absolute left-[48px] top-1/2 z-40 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0E58A8]">
          {text.createTable}
        </span>
      </div>

      <button
        data-custom-tables-fab-interactive="true"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'absolute z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#0E58A8] text-white transition hover:bg-[#0B4A8D]',
          styles.buttonLeft,
          styles.bottom,
        )}
        aria-label={text.openMenu}
      >
        <Plus
          size={24}
          className={cn('transition-transform duration-300', isOpen ? 'rotate-45' : 'rotate-0')}
        />
      </button>
    </div>
  );
}
