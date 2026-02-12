'use client';

import { Download, MoreVertical, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
type ReactPdfModule = typeof import('react-pdf');
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { ModalShell } from './ui/modal-shell';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  source?: 'statement' | 'gmail';
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

export function PDFPreviewModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  source = 'statement',
}: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(920);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfModule, setPdfModule] = useState<ReactPdfModule | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const DocumentComponent = pdfModule?.Document;
  const PageComponent = pdfModule?.Page;

  useEffect(() => {
    if (!isOpen) {
      setPdfObjectUrl(null);
      setNumPages(0);
      setLoading(false);
      setError(null);
      setMenuOpen(false);
      return;
    }

    let cancelled = false;
    let localObjectUrl: string | null = null;

    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = getWorkspaceHeaders();
        if (!headers.Authorization) {
          setError('Необходима авторизация');
          setLoading(false);
          return;
        }

        const fileEndpoint =
          source === 'gmail'
            ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/file`
            : `${apiBaseUrl}/statements/${fileId}/file`;

        const response = await fetch(fileEndpoint, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Ошибка загрузки файла: ${response.status}`);
        }

        const blob = await response.blob();
        localObjectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPdfObjectUrl(localObjectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить файл');
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [isOpen, fileId, source]);

  useEffect(() => {
    if (!isOpen || pdfModule) return;

    let active = true;

    const loadPdfRenderer = async () => {
      try {
        const module = await import('react-pdf');
        module.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.mjs`;
        if (active) {
          setPdfModule(module);
        }
      } catch (err) {
        console.error('Error loading PDF renderer:', err);
        if (active) {
          setError('Не удалось загрузить просмотрщик PDF');
        }
      }
    };

    loadPdfRenderer();

    return () => {
      active = false;
    };
  }, [isOpen, pdfModule]);

  useEffect(() => {
    if (!isOpen || !viewportRef.current) {
      return;
    }

    const node = viewportRef.current;

    const updatePageWidth = () => {
      const width = Math.floor(node.clientWidth - 120);
      setPageWidth(Math.max(520, Math.min(1080, width)));
    };

    updatePageWidth();

    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
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

      const fileEndpoint =
        source === 'gmail'
          ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/file`
          : `${apiBaseUrl}/statements/${fileId}/file`;

      const response = await fetch(fileEndpoint, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка скачивания файла');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-none overflow-hidden rounded-[22px] border border-[#d4e3d6] shadow-[0_24px_80px_rgba(16,24,40,0.16)]"
      contentClassName="!h-full !p-0"
    >
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div
          className="relative flex items-center justify-between border-b border-[#e4e6e3] px-5 py-4"
          ref={menuRef}
        >
          <h2 className="text-[22px] font-semibold leading-none text-[#0f3428]">Receipt</h2>

          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(prev => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-[#eaf5ee]"
              aria-label="Open file menu"
            >
              <MoreVertical size={24} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#9aa39e] transition-colors hover:bg-[#eef2ee] hover:text-[#6f7773]"
              aria-label="Close preview"
            >
              <X size={33} strokeWidth={2.4} />
            </button>
          </div>

          {menuOpen && (
            <div className="absolute right-5 top-[calc(100%+12px)] z-40 w-[360px] max-w-[calc(100vw-90px)] rounded-[24px] border border-[#d8ddd8] bg-white p-2 shadow-[0_14px_28px_rgba(17,24,39,0.14)]">
              <button
                type="button"
                onClick={handleDownloadFromMenu}
                className="flex w-full items-center gap-4 rounded-[18px] px-5 py-4 text-left transition-colors hover:bg-[#f5f8f5]"
              >
                <Download className="h-7 w-7 text-[#99a39d]" strokeWidth={2.3} />
                <span className="text-[22px] font-semibold leading-none text-[#0f3428]">Download</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 bg-[#f3f4f2]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                <p className="text-sm font-medium text-gray-500">Загрузка документа...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="max-w-md p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-100 bg-red-50">
                  <X size={24} className="text-red-500" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Ошибка загрузки</h3>
                <p className="mb-4 text-sm text-gray-500">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}

          {!error && pdfObjectUrl && DocumentComponent && PageComponent && (
            <div ref={viewportRef} className="h-full min-h-0 overflow-y-auto px-5 py-7">
              <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6">
                <DocumentComponent
                  file={pdfObjectUrl}
                  loading={null}
                  onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
                  onLoadError={() => setError('Не удалось отобразить документ')}
                  className="w-full"
                >
                  {Array.from({ length: numPages }, (_, index) => (
                    <div key={`page_${index + 1}`} className="flex w-full justify-center">
                      <PageComponent
                        pageNumber={index + 1}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="overflow-hidden rounded-[2px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                      />
                    </div>
                  ))}
                </DocumentComponent>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
