'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isChatModePreferred } from './chat-mode-preference';

/** Paths that must stay reachable even when chat mode is the preferred shell. */
const EXEMPT_PREFIXES = ['/chat', '/login', '/register', '/onboarding', '/shared', '/invite'];

/**
 * Sends users who chose chat mode straight to /chat on app entry. Runs once
 * per mount, not on every navigation: leaving /chat via "Full interface" must
 * not bounce the user back.
 */
export function ChatModeRedirect(): null {
  const router = useRouter();
  const pathname = usePathname();

  // Intentionally mount-only; `pathname` at mount decides whether to redirect.
  // biome-ignore lint/correctness/useExhaustiveDependencies: redirect must fire once per app load
  useEffect(() => {
    if (!pathname || EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      return;
    }
    if (isChatModePreferred()) {
      router.replace('/chat');
    }
  }, []);

  return null;
}
