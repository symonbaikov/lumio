'use client';

import { Download, MoreVertical, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { ModalShell } from './ui/modal-shell';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

export function PDFPreviewModal({ isOpen, onClose, fileId, fileName }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setLoading(true);
      setError(null);
      setMenuOpen(false);
      return;
    }

    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = getWorkspaceHeaders();
        if (!headers.Authorization) {
          setError('Необходима авторизация');
          setLoading(false);
          return;
        }

        const response = await fetch(`${apiBaseUrl}/statements/${fileId}/view`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Ошибка загрузки файла: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить файл');
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, fileId]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [menuOpen]);

  const handleDownload = async () => {
    try {
      const headers = getWorkspaceHeaders();
      if (!headers.Authorization) {
        alert('Необходима авторизация');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/statements/${fileId}/file`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка скачивания файла');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Не удалось скачать файл');
    }
  };

  const handleDownloadFromMenu = () => {
    setMenuOpen(false);
    void handleDownload();
  };

  const headerContent = (
    <div className="flex w-full items-center justify-between">
      <div className="truncate pr-3 text-[30px] font-semibold leading-none text-[#0f3428] sm:text-[32px]">
        Receipt
      </div>
      <div className="flex items-center gap-1" ref={menuRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(prev => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#22b36a] transition-colors hover:bg-[#eaf5ee]"
            aria-label="Open file menu"
          >
            <MoreVertical size={24} strokeWidth={2.4} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-20 min-w-[250px] rounded-[24px] border border-[#d8ddd8] bg-white p-2 shadow-[0_18px_40px_rgba(17,24,39,0.16)]">
              <button
                type="button"
                onClick={handleDownloadFromMenu}
                className="flex w-full items-center gap-5 rounded-[18px] px-5 py-6 text-left transition-colors hover:bg-[#f5f8f5]"
              >
                <Download className="h-9 w-9 text-[#99a39d]" strokeWidth={2.4} />
                <span className="text-[40px] font-semibold leading-none text-[#0f3428]">Download</span>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#9aa39e] transition-colors hover:bg-[#eef2ee] hover:text-[#6f7773]"
          aria-label="Close preview"
        >
          <X size={33} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={headerContent}
      size="full"
      showCloseButton={false}
      className="overflow-visible rounded-[22px] border border-[#d4e3d6] shadow-[0_24px_80px_rgba(16,24,40,0.16)]"
      contentClassName="!p-0"
    >
      <div className="relative h-[calc(90vh-78px)] bg-[#f3f4f2]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-black mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">Загрузка документа...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center max-w-md p-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <X size={24} className="text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {!error && pdfUrl && (
          <div className="h-full overflow-auto p-4 sm:p-6">
            <div className="mx-auto h-full w-full max-w-[1320px] overflow-hidden rounded-[6px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
              <iframe
                src={pdfUrl}
                className="block h-full w-full"
                title={fileName}
                style={{ border: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
