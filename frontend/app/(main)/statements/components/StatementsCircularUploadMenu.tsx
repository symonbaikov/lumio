'use client';

import { Cloud, Inbox, Plus, Receipt, Scan, ScanLine } from '@/app/components/icons';
import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
  buildStatementUploadMenuModel,
} from '@/app/lib/statement-upload-actions';
import { tokens } from '@/lib/theme-tokens';
import React, { useEffect, useMemo, useState } from 'react';
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
    heightPx: 232,
    widthPx: 320,
    buttonLeftPx: 16,
    bottomPx: 20,
    scanBottomPx: 84,
    closedOffset: 'translate(16px, -6px)',
    containerStyle: {
      marginLeft: -16,
      marginRight: -16,
      marginBottom: -12,
      height: 96,
    } as React.CSSProperties,
  },
  floating: {
    heightPx: 240,
    widthPx: 320,
    buttonLeftPx: 24,
    bottomPx: 24,
    scanBottomPx: 88,
    closedOffset: 'translate(8px, -6px)',
    containerStyle: { height: 240, width: 320 } as React.CSSProperties,
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
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }

    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const menuItems = useMemo(() => buildStatementUploadMenuModel(providers), [providers]);

  const uploadTriggerTourId =
    (placement === 'panel' && isDesktopViewport) || (placement === 'floating' && !isDesktopViewport)
      ? 'statements-upload-trigger'
      : undefined;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches);
    };

    setIsDesktopViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
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
      return <ScanLine size={18} color="var(--primary)" />;
    }

    if (item.id === 'cloud-import') {
      if (item.provider === 'dropbox') {
        return <Cloud size={18} color="var(--primary)" />;
      }

      if (item.provider === 'google-drive') {
        return <Cloud size={18} color="var(--primary)" />;
      }

      return <Cloud size={18} color="var(--primary)" />;
    }

    if (item.id === 'gmail') {
      return <Inbox size={18} color="var(--primary)" />;
    }

    return <Receipt size={18} color="var(--muted-foreground)" />;
  };

  const styles = ARC_SIZES[placement];

  const backdrop = portalReady
    ? createPortal(
        <button
          data-statements-fab-backdrop="true"
          type="button"
          aria-label="Close upload actions"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.45)',
            transition: 'opacity 0.3s ease-out',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: isOpen ? 'auto' : 'none',
            opacity: isOpen ? 1 : 0,
          }}
        />,
        document.body,
      )
    : null;

  const menu = (
    <div
      style={{
        position: 'relative',
        overflow: 'visible',
        zIndex: isOpen ? 310 : undefined,
        pointerEvents: placement === 'floating' ? 'none' : undefined,
        ...styles.containerStyle,
      }}
    >
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: 0,
          left: 0,
          zIndex: 30,
          transition: 'all 0.3s ease-out',
          height: isOpen ? styles.heightPx : 0,
          width: isOpen ? styles.widthPx : 0,
          borderTopRightRadius: isOpen ? styles.heightPx : 0,
          opacity: isOpen ? 1 : 0,
          background: isOpen ? 'rgba(var(--primary-rgb, 0,0,0),0.05)' : 'transparent',
          backdropFilter: isOpen ? 'blur(4px)' : undefined,
        }}
      />

      {menuItems.map((item, index) => {
        const fallbackOffset = ACTION_OFFSETS[ACTION_OFFSETS.length - 1];
        const offset = ACTION_OFFSETS[index] ?? fallbackOffset;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: 0,
              bottom: styles.bottomPx,
              zIndex: 40,
              transition: 'all 0.3s ease-out',
              transform: isOpen ? `translate(${offset.x}px, ${offset.y}px)` : styles.closedOffset,
              pointerEvents: isOpen ? 'auto' : 'none',
              opacity: isOpen ? 1 : 0,
            }}
          >
            <button
              data-statements-fab-interactive="true"
              type="button"
              disabled={item.disabled}
              onClick={() => handleActionClick(item.id, item.provider)}
              title={item.label}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                height: 44,
                width: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: tokens.radius.full,
                border: '1px solid var(--border-color, #e5e7eb)',
                background: 'var(--card-bg, #fff)',
                color: 'var(--foreground)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease-out',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.45 : 1,
              }}
            >
              {renderActionIcon(item)}
              <span
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </button>
            <span
              style={{
                position: 'absolute',
                left: 48,
                top: '50%',
                zIndex: 50,
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                borderRadius: tokens.radius.sm,
                border: '1px solid var(--border-color, #e5e7eb)',
                background: 'var(--card-bg, #fff)',
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                color: item.id === 'local-upload' ? 'var(--foreground)' : 'var(--primary)',
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}

      <button
        data-statements-fab-interactive="true"
        type="button"
        onClick={() => {
          onScan();
          setIsOpen(false);
        }}
        style={{
          position: 'absolute',
          display: 'flex',
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radius.full,
          // --primary-fill, not --primary: this is a filled control with white
          // text, and the accent green is unreadable in that role on dark.
          background: 'var(--primary-fill)',
          color: '#fff',
          transition: 'all 0.2s',
          border: 'none',
          cursor: 'pointer',
          left: styles.buttonLeftPx,
          bottom: styles.scanBottomPx,
          zIndex: isOpen ? 10 : 20,
          pointerEvents: isOpen ? 'none' : 'auto',
          opacity: isOpen ? 0 : 1,
        }}
        aria-label="Scan"
      >
        <Scan size={24} />
      </button>

      <button
        data-statements-fab-interactive="true"
        data-tour-id={uploadTriggerTourId}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          zIndex: 60,
          display: 'flex',
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radius.full,
          border: '1px solid var(--border-color, #e5e7eb)',
          background: 'var(--card-bg, #fff)',
          color: 'var(--muted-foreground)',
          boxShadow: tokens.shadow.sm,
          cursor: 'pointer',
          left: styles.buttonLeftPx,
          bottom: styles.bottomPx,
          transition: 'background 0.15s, color 0.15s',
        }}
        aria-label="Open upload actions"
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

  // On mobile, the bottom bar FAB replaces the floating menu
  if (placement === 'floating' && !isDesktopViewport) {
    return null;
  }

  if (placement === 'floating' && portalReady) {
    const portalTarget = document.getElementById('fab-portal') ?? document.body;
    return createPortal(
      <>
        {backdrop}
        <div
          style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 320, pointerEvents: 'none' }}
          data-mobile-only="true"
        >
          {menu}
        </div>
      </>,
      portalTarget,
    );
  }

  return (
    <>
      {backdrop}
      {menu}
    </>
  );
}
