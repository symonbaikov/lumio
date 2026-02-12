'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import pdfIcon from '../../public/images/pdf.png';

interface PDFThumbnailProps {
  fileId: string;
  fileName?: string;
  source?: 'statement' | 'gmail';
  size?: number;
  className?: string;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

const thumbnailCache = new Map<string, string>();

export function PDFThumbnail({
  fileId,
  fileName,
  source = 'statement',
  size = 40,
  className = '',
}: PDFThumbnailProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `${source}:${fileId}`;

    const fetchThumbnail = async () => {
      // Check in-memory cache first
      if (thumbnailCache.has(cacheKey)) {
        const cached = thumbnailCache.get(cacheKey);
        if (isMounted) {
          if (cached) {
            setThumbnailDataUrl(cached);
          } else {
            setError(true);
          }
          setLoading(false);
        }
        return;
      }

      try {
        const headers = getWorkspaceHeaders();

        if (!headers.Authorization) {
          setError(true);
          setLoading(false);
          return;
        }

        const thumbnailUrl =
          source === 'gmail'
            ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/thumbnail`
            : `${apiBaseUrl}/statements/${fileId}/thumbnail`;

        const response = await fetch(thumbnailUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'default',
        });

        if (!response.ok) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        const blob = await response.blob();

        // Convert Blob to Base64 Data URL for safe caching
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          thumbnailCache.set(cacheKey, base64data);
          if (isMounted) {
            setThumbnailDataUrl(base64data);
            setLoading(false);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchThumbnail();

    return () => {
      isMounted = false;
    };
  }, [fileId, source]);

  // If error occurred, show default PDF icon
  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Image
          src={pdfIcon}
          alt="PDF"
          width={size * 0.6}
          height={size * 0.6}
          className={className}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="relative shadow-sm rounded-xl overflow-hidden"
      style={{ width: size, height: size }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
      {thumbnailDataUrl && (
        <img
          src={thumbnailDataUrl}
          alt={fileName || 'PDF thumbnail'}
          className={`w-full h-full object-contain ${className}`}
          style={{ transition: 'opacity 0.2s' }}
        />
      )}
    </div>
  );
}
