'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, Plus, Table as TableIcon } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

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
  { x: 28, y: -164 },
  { x: 98, y: -94 },
  { x: 170, y: -14 },
] as const;

const ARC_SIZES = {
  panel: {
    height: 232,
    width: 272,
    radius: '232px',
    buttonLeft: 16,
    bottom: 20,
    closedOffset: 'translate(16px, -6px)',
    containerHeight: 208,
    containerWidth: undefined as number | undefined,
  },
  floating: {
    height: 240,
    width: 320,
    radius: '240px',
    buttonLeft: 24,
    bottom: 24,
    closedOffset: 'translate(8px, -6px)',
    containerHeight: 240,
    containerWidth: 320,
  },
} as const;

const ACTION_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  height: 44,
  width: 44,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: tokens.radius.full,
  border: '1px solid rgba(255,255,255,0.8)',
  backgroundColor: 'var(--card-bg)',
  cursor: 'pointer',
  transition: 'transform 0.3s ease-out',
};

const ACTION_LABEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 48,
  top: '50%',
  zIndex: 40,
  transform: 'translateY(-50%)',
  whiteSpace: 'nowrap',
  borderRadius: tokens.radius.sm,
  backgroundColor: 'rgba(255,255,255,0.95)',
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-primary)',
};

const SR_ONLY_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
};

function resolveLabels(labels: Props['labels']) {
  return {
    importGoogleSheets: labels?.importGoogleSheets ?? 'Google Sheets',
    fromStatement: labels?.fromStatement ?? 'From statement',
    createTable: labels?.createTable ?? 'Create table',
    openMenu: labels?.openMenu ?? 'Open table actions',
  };
}

function FabActionItem({
  isOpen,
  offset,
  closedOffset,
  bottom,
  label,
  onClick,
  children,
}: {
  isOpen: boolean;
  offset: (typeof ACTION_OFFSETS)[number];
  closedOffset: string;
  bottom: number;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const transform = isOpen ? `translate(${offset.x}px, ${offset.y}px)` : closedOffset;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom,
        zIndex: 20,
        transition: 'all 0.3s ease-out',
        transform,
        pointerEvents: isOpen ? 'auto' : 'none',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <button
        data-custom-tables-fab-interactive="true"
        type="button"
        onClick={onClick}
        title={label}
        style={ACTION_BUTTON_STYLE}
      >
        {children}
        <span style={SR_ONLY_STYLE}>{label}</span>
      </button>
      <span style={ACTION_LABEL_STYLE}>{label}</span>
    </div>
  );
}

export default function CustomTablesCircularMenu({
  onCreateEmpty,
  onImportFromStatement,
  onImportGoogleSheets,
  placement = 'panel',
  labels,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(true);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktopViewport(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-custom-tables-fab-interactive="true"]')) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const sizes = ARC_SIZES[placement];
  const text = resolveLabels(labels);

  const handleAction = (callback: () => void) => () => {
    callback();
    setIsOpen(false);
  };

  const isPanel = placement === 'panel';
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'visible',
    height: sizes.containerHeight,
    width: sizes.containerWidth,
    ...(isPanel ? { marginLeft: -16, marginRight: -16, marginBottom: -12 } : {}),
    ...(!isPanel
      ? { position: 'fixed', bottom: 0, left: 0, zIndex: 140, pointerEvents: 'auto' }
      : {}),
  };

  const arcStyle: React.CSSProperties = {
    pointerEvents: 'none',
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-primary)',
    transition: 'all 0.3s ease-out',
    height: isOpen ? sizes.height : 0,
    width: isOpen ? sizes.width : 0,
    borderTopRightRadius: isOpen ? sizes.radius : 0,
    opacity: isOpen ? 1 : 0,
  };

  const menu = (
    <div style={containerStyle}>
      <div style={arcStyle} />

      <FabActionItem
        isOpen={isOpen}
        offset={ACTION_OFFSETS[0]}
        closedOffset={sizes.closedOffset}
        bottom={sizes.bottom}
        label={text.importGoogleSheets}
        onClick={handleAction(onImportGoogleSheets)}
      >
        <Image
          src="/icons/icons8-google-sheets-48.png"
          alt="Google Sheets"
          width={18}
          height={18}
        />
      </FabActionItem>

      <FabActionItem
        isOpen={isOpen}
        offset={ACTION_OFFSETS[1]}
        closedOffset={sizes.closedOffset}
        bottom={sizes.bottom}
        label={text.fromStatement}
        onClick={handleAction(onImportFromStatement)}
      >
        <FileSpreadsheet size={18} style={{ color: 'var(--color-primary)' }} />
      </FabActionItem>

      <FabActionItem
        isOpen={isOpen}
        offset={ACTION_OFFSETS[2]}
        closedOffset={sizes.closedOffset}
        bottom={sizes.bottom}
        label={text.createTable}
        onClick={handleAction(onCreateEmpty)}
      >
        <TableIcon size={18} style={{ color: 'var(--color-primary)' }} />
      </FabActionItem>

      <button
        data-custom-tables-fab-interactive="true"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'absolute',
          zIndex: 30,
          display: 'flex',
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radius.full,
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          left: sizes.buttonLeft,
          bottom: sizes.bottom,
        }}
        aria-label={text.openMenu}
      >
        <Plus
          size={24}
          style={{
            transition: 'transform 0.3s',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  );

  if (placement === 'floating' && !isDesktopViewport) {
    return null;
  }

  if (placement === 'floating' && portalReady) {
    const portalTarget = document.getElementById('fab-portal') ?? document.body;
    return createPortal(menu, portalTarget);
  }

  return menu;
}
