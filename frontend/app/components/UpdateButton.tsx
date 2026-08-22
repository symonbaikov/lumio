'use client';

import { Download } from '@/app/components/icons';
import { useEffect, useState } from 'react';

const REPO = 'symonbaikov/lumio';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${REPO}/releases/latest`;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Baked in at build time by next.config.js. */
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME;

export function isUpdateAvailable(
  buildTime: string | undefined,
  releasePublishedAt: string | undefined,
): boolean {
  const built = Date.parse(buildTime ?? '');
  const released = Date.parse(releasePublishedAt ?? '');
  if (Number.isNaN(built) || Number.isNaN(released)) return false;
  return released > built;
}

export function UpdateButton() {
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    if (!BUILD_TIME) return;
    const controller = new AbortController();

    const check = async (): Promise<void> => {
      try {
        // 404 until release-please cuts the first release — the button simply stays hidden.
        const res = await fetch(LATEST_RELEASE_URL, {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return;
        const release = await res.json();
        setTag(isUpdateAvailable(BUILD_TIME, release?.published_at) ? release.tag_name : null);
      } catch {
        // Offline or rate-limited: keep the button hidden.
      }
    };

    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  if (!tag) return null;

  return (
    <a
      href={RELEASES_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="lumio-topbar__update"
      title={`Release ${tag} is available. Update with: git pull && docker compose up -d --build`}
    >
      <Download size={14} />
      Update
    </a>
  );
}
