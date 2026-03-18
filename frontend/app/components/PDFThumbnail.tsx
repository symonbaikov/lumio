'use client';

import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import ErrorIcon from '@mui/icons-material/Error';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PDFThumbnailProps {
  fileId: string;
  fileName?: string;
  source?: 'statement' | 'gmail';
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  errorMessage?: string;
  preservePageAspect?: boolean;
}

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/v1' : '/api/v1')
).replace(/\/$/, '');
const DEFAULT_THUMBNAIL_WIDTH = 200;
const MIN_THUMBNAIL_WIDTH = 80;
const MAX_THUMBNAIL_WIDTH = 1600;

const thumbnailCache = new Map<string, string>();

export function PDFThumbnail({
  fileId,
  fileName,
  source = 'statement',
  size = 40,
  width,
  height,
  className = '',
  errorMessage,
  preservePageAspect = false,
}: PDFThumbnailProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const requestedWidth = Math.max(
    MIN_THUMBNAIL_WIDTH,
    Math.min(MAX_THUMBNAIL_WIDTH, Math.round(width ?? DEFAULT_THUMBNAIL_WIDTH)),
  );

  const frameWidth = width ?? size;
  const maxFrameHeight = height ?? size;
  const resolvedFrameHeight =
    preservePageAspect && imageAspectRatio
      ? Math.min(maxFrameHeight, Math.round(frameWidth / imageAspectRatio))
      : maxFrameHeight;

  useEffect(() => {
    if (!thumbnailDataUrl || !preservePageAspect) {
      setImageAspectRatio(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return;
      }
      setImageAspectRatio(image.naturalWidth / image.naturalHeight);
    };
    image.onerror = () => {
      if (!cancelled) {
        setImageAspectRatio(null);
      }
    };
    image.src = thumbnailDataUrl;

    return () => {
      cancelled = true;
    };
  }, [thumbnailDataUrl, preservePageAspect]);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `${source}:${fileId}:${requestedWidth}`;

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
            ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/thumbnail?width=${requestedWidth}`
            : `${apiBaseUrl}/statements/${fileId}/thumbnail?width=${requestedWidth}`;

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
  }, [fileId, source, requestedWidth]);

  // If error occurred, show default PDF icon
  if (error) {
    const fallbackIconSize = Math.max(14, Math.round(size * 0.8));
    const frameHeight = maxFrameHeight;

    if (errorMessage) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-center"
          style={{ width: frameWidth, height: frameHeight }}
        >
          <ErrorIcon data-testid="pdf-thumbnail-error-icon" className="text-gray-400" />
          <p className="text-sm text-gray-500">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-center"
        style={{ width: frameWidth, height: frameHeight }}
      >
        <FileText
          data-testid="pdf-thumbnail-fallback-icon"
          size={fallbackIconSize}
          className="text-gray-400"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="pdf-thumbnail-frame"
      className="relative shadow-sm rounded-xl overflow-hidden"
      style={{ width: frameWidth, height: resolvedFrameHeight }}
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
