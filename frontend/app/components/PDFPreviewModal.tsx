'use client';

import { Download, ExternalLink, FileText, Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setLoading(true);
      setError(null);
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

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Custom header with action buttons
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
          <FileText className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900 truncate text-sm leading-tight">
            {fileName}
          </span>
          <span className="text-xs text-gray-400 mt-0.5 font-normal">PDF Document</span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-4 border-l border-gray-100 pl-4">
        <button
          type="button"
          onClick={handleDownload}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
          title="Скачать"
        >
          <Download size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
          title="Печать"
          disabled={!pdfUrl}
        >
          <Printer size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handleOpenInNewTab}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
          title="Открыть в новой вкладке"
          disabled={!pdfUrl}
        >
          <ExternalLink size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={headerContent}
      size="xl"
      showCloseButton={true}
      className="rounded-2xl overflow-hidden border border-gray-100 shadow-2xl"
      contentClassName="!p-0"
    >
      <div className="h-[85vh] bg-gray-50 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-black mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">Загрузка документа...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
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
          <iframe
            src={pdfUrl}
            className="w-full h-full block"
            title={fileName}
            style={{ border: 'none' }}
          />
        )}
      </div>
    </ModalShell>
  );
}
