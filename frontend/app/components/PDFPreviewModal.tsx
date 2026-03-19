'use client';

import { Download, MoreVertical, X } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
type ReactPdfModule = typeof import('react-pdf');
import { useIntlayer } from '@/app/i18n';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { ModalShell } from './ui/modal-shell';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  source?: 'statement' | 'gmail';
  allowAttachFile?: boolean;
  onFileAttached?: () => void;
  onParsingStarted?: () => void;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

export function PDFPreviewModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  source = 'statement',
  allowAttachFile = false,
  onFileAttached,
  onParsingStarted,
}: PDFPreviewModalProps) {
  const t = useIntlayer('pdfPreviewModal');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(920);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfModule, setPdfModule] = useState<ReactPdfModule | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [attachingFile, setAttachingFile] = useState(false);
  const [showParsePrompt, setShowParsePrompt] = useState(false);
  const [startingParsing, setStartingParsing] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

  const DocumentComponent = pdfModule?.Document;
  const PageComponent = pdfModule?.Page;

  useEffect(() => {
    if (!isOpen) {
      setPdfObjectUrl(null);
      setNumPages(0);
      setLoading(false);
      setError(null);
      setMenuOpen(false);
      setShowParsePrompt(false);
      setAttachingFile(false);
      setStartingParsing(false);
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
          setError(t.errors.authRequired.value);
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
          throw new Error(`${t.errors.fileLoadError.value}: ${response.status}`);
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
          setError(err instanceof Error ? err.message : t.errors.fileLoadFailed.value);
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
  }, [isOpen, fileId, source, reloadToken]);

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
          setError(t.errors.pdfRendererFailed.value);
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
        alert(t.errors.authRequired.value);
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
        throw new Error(t.errors.downloadFailed.value);
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
      alert(t.errors.downloadAlertFailed.value);
    }
  };

  const handleDownloadFromMenu = () => {
    setMenuOpen(false);
    void handleDownload();
  };

  const handleAttachClick = () => {
    attachInputRef.current?.click();
  };

  const handleAttachFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) {
      return;
    }

    try {
      const headers = getWorkspaceHeaders();
      if (!headers.Authorization) {
        setError(t.errors.authRequired.value);
        return;
      }

      setAttachingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${apiBaseUrl}/statements/${fileId}/attach-file`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.errors.uploadFailed.value);
      }

      setError(null);
      onFileAttached?.();
      setShowParsePrompt(true);
      setReloadToken(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.uploadFailed.value);
    } finally {
      setAttachingFile(false);
    }
  };

  const handleStartReplaceParsing = async () => {
    try {
      const headers = getWorkspaceHeaders();
      if (!headers.Authorization) {
        setError(t.errors.authRequired.value);
        return;
      }

      setStartingParsing(true);
      const response = await fetch(`${apiBaseUrl}/statements/${fileId}/reprocess?mode=replace`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(t.errors.parsingFailed.value);
      }

      setShowParsePrompt(false);
      onParsingStarted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.parsingFailed.value);
    } finally {
      setStartingParsing(false);
    }
  };

  const showAttachFallback = allowAttachFile && source === 'statement';

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
                <span className="text-[22px] font-semibold leading-none text-[#0f3428]">
                  Download
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 bg-[#f3f4f2]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                <p className="text-sm font-medium text-gray-500">{t.loading.value}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="max-w-md p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-100 bg-red-50">
                  <X size={24} className="text-red-500" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  {showAttachFallback ? t.fileNotAttached.value : t.loadError.value}
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  {showAttachFallback ? t.uploadFileHint.value : error}
                </p>

                {showAttachFallback ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      ref={attachInputRef}
                      type="file"
                      accept="application/pdf,image/*,.csv,.xlsx,.xls,.docx"
                      onChange={handleAttachFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      disabled={attachingFile}
                      className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {attachingFile ? t.uploading.value : t.uploadFile.value}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {t.close.value}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
                  >
                    {t.close.value}
                  </button>
                )}
              </div>
            </div>
          )}

          {showParsePrompt && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_36px_rgba(15,23,42,0.2)]">
                <h3 className="text-base font-semibold text-[#0f3428]">{t.startParsing.value}</h3>
                <p className="mt-2 text-sm text-gray-600">{t.startParsingDescription.value}</p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowParsePrompt(false)}
                    disabled={startingParsing}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t.decline.value}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartReplaceParsing}
                    disabled={startingParsing}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    {startingParsing ? t.startingParsing.value : t.startParsingButton.value}
                  </button>
                </div>
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
                  onLoadError={() => setError(t.errors.displayFailed.value)}
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
