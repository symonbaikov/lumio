'use client';

import type { RefObject } from 'react';
import { Download, MoreVertical, X } from '@/app/components/icons';

type HeaderProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onClose: () => void;
  onDownload: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
};

export function PDFPreviewHeader({
  menuOpen,
  onToggleMenu,
  onClose,
  onDownload,
  containerRef,
}: HeaderProps): React.JSX.Element {
  return (
    <div className="lumio-pdf-preview-modal__header" ref={containerRef}>
      <h2 className="lumio-pdf-preview-modal__title">Receipt</h2>
      <div className="lumio-pdf-preview-modal__header-actions">
        <button
          type="button"
          onClick={onToggleMenu}
          className="lumio-pdf-preview-modal__menu-btn"
          aria-label="Open file menu"
        >
          <MoreVertical size={24} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="lumio-pdf-preview-modal__close-btn"
          aria-label="Close preview"
        >
          <X size={33} strokeWidth={2.4} />
        </button>
      </div>
      {menuOpen && (
        <div className="lumio-pdf-preview-modal__dropdown-menu">
          <button
            type="button"
            onClick={onDownload}
            className="lumio-pdf-preview-modal__dropdown-item"
          >
            <Download className="lumio-pdf-preview-modal__dropdown-icon" strokeWidth={2.3} />
            <span className="lumio-pdf-preview-modal__dropdown-label">Download</span>
          </button>
        </div>
      )}
    </div>
  );
}
