'use client';

import { gmailReceiptsApi } from '@/app/lib/api';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReceiptPreviewModalProps {
  receiptId: string;
  onClose: () => void;
}

interface ReceiptPreviewAttachment {
  filename: string;
  mimeType: string;
  data: string;
}

interface ReceiptPreviewResponse {
  attachmentData?: ReceiptPreviewAttachment[];
  emailBody?: string;
  snippet?: string;
}

export function ReceiptPreviewModal({ receiptId, onClose }: ReceiptPreviewModalProps) {
  const [preview, setPreview] = useState<ReceiptPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      try {
        setLoading(true);
        const response = await gmailReceiptsApi.getReceiptPreview(receiptId);
        if (active) {
          setPreview(response.data);
        }
      } catch (error) {
        console.error('Failed to load preview', error);
        if (active) {
          setPreview(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [receiptId]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading preview...</div>
        </div>
      );
    }

    if (!preview) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Failed to load preview</div>
        </div>
      );
    }

    const attachments = preview.attachmentData ?? [];
    if (attachments.length > 0) {
      return (
        <div className="space-y-4">
          {attachments.map((attachment, idx) => {
            const isPdf = attachment.mimeType === 'application/pdf';
            const isImage = attachment.mimeType?.startsWith('image/');
            const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
            const dataUrl = `data:${attachment.mimeType};base64,${base64Data}`;

            return (
              <div key={`${attachment.filename}-${idx}`} className="bg-white border rounded-lg">
                <div className="p-3 border-b bg-gray-50">
                  <span className="text-sm font-medium">{attachment.filename}</span>
                </div>
                <div className="p-4">
                  {isPdf ? (
                    <iframe
                      src={dataUrl}
                      className="w-full h-[600px] border rounded"
                      title={attachment.filename}
                    />
                  ) : isImage ? (
                    <img
                      src={dataUrl}
                      alt={attachment.filename}
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>Preview not available for this file type</p>
                      <p className="text-sm mt-2">{attachment.mimeType}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (preview.emailBody) {
      return (
        <div className="bg-white border rounded-lg overflow-hidden">
          <iframe
            title="Receipt email preview"
            className="w-full h-[600px]"
            sandbox="allow-same-origin"
            srcDoc={preview.emailBody}
          />
        </div>
      );
    }

    return (
      <div className="text-center text-gray-500 py-8">
        <p>No preview available</p>
        {preview.snippet ? <p className="mt-2 text-sm">{preview.snippet}</p> : null}
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-75 z-50"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
          }
        }}
        aria-label="Close receipt preview"
      />
      <div className="fixed inset-4 bg-white rounded-lg z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Receipt Preview</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">{zoom}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg ml-4"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {renderPreviewContent()}
          </div>
        </div>
      </div>
    </>
  );
}
