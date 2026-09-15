'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import {
  DEFAULT_CONTENT_BACKGROUND_DIM,
  presetFileName,
  resolveContentBackgroundSrc,
} from '@/app/lib/content-background';

/**
 * The user's photo behind the content area. Rendered just before
 * .lumio-shell__content, which is positioned and so paints over it; it sets
 * html[data-content-bg], which turns the surfaces above it into glass
 * (styles/layout/_shell.scss).
 */
export default function ContentBackground(): React.JSX.Element | null {
  const { user } = useAuth();
  const background = user?.contentBackground ?? null;
  const dim = user?.contentBackgroundDim ?? DEFAULT_CONTENT_BACKGROUND_DIM;
  const hasBackground = Boolean(background);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasBackground) return;

    const root = document.documentElement;
    root.dataset.contentBg = 'true';
    return () => {
      delete root.dataset.contentBg;
    };
  }, [hasBackground]);

  if (!background) return null;

  const src = resolveContentBackgroundSrc(background);

  return (
    <div className="lumio-content-bg" aria-hidden="true">
      <Image
        className="lumio-content-bg__image"
        src={src}
        alt=""
        fill
        sizes="100vw"
        quality={75}
        // Bundled photos are multi-megabyte originals the optimizer resizes;
        // uploads come from the API origin, which it is not configured to fetch.
        unoptimized={presetFileName(background) === null}
        data-loaded={loadedSrc === src}
        onLoad={() => setLoadedSrc(src)}
      />
      <div className="lumio-content-bg__dim" style={{ opacity: dim / 100 }} />
    </div>
  );
}
