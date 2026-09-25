'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** How long the ring stays before it fades out. */
const HIGHLIGHT_MS = 3000;
/** Give up waiting for the target rather than observing the DOM forever. */
const WAIT_MS = 5000;

const ATTENTION_CLASS = 'lumio-attention';
const FOCUS_PARAM = 'focus';

/**
 * Runs `onFound` with the first element matching `selector`, now or as soon as
 * it renders — the target of a deep link usually appears only once its data has
 * loaded. Returns a cleanup that stops waiting.
 */
function whenPresent(selector: string, onFound: (element: Element) => void): () => void {
  const noop = (): void => undefined;
  const existing = document.querySelector(selector);
  if (existing) {
    onFound(existing);
    return noop;
  }

  const observer = new MutationObserver(() => {
    const element = document.querySelector(selector);
    if (element) {
      observer.disconnect();
      window.clearTimeout(timer);
      onFound(element);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = window.setTimeout(() => observer.disconnect(), WAIT_MS);

  return () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
}

/**
 * Scrolls to the element a deep link points at and rings it in green.
 *
 * The link carries `?focus=<id>` and the target marks itself with
 * `data-attention="<id>"`, so pages opt in by tagging one element instead of
 * each one growing its own deep-link plumbing. Insight notifications are the
 * only producer today (see app/components/insights/insight-href.ts).
 *
 * Call it from the destination page, not from the layout: a layout is not
 * remounted on soft navigation, so arriving at the page you are already on
 * with a different target would do nothing.
 */
export function useAttentionFocus(): void {
  const targetId = useSearchParams().get(FOCUS_PARAM);
  const cleanupRef = useRef<() => void>(() => undefined);

  // Tearing down belongs to the page's lifetime, not to the parameter's: the
  // effect below deliberately returns nothing, so React cannot undo a
  // highlight the moment the parameter is cleared.
  useEffect(() => () => cleanupRef.current(), []);

  useEffect(() => {
    if (!targetId) {
      return;
    }
    cleanupRef.current();

    // Cleared through history rather than `router.replace` — the page content
    // is already here and a navigation would only round-trip. Cleared even
    // when nothing matches, so a target that never appears (an insight written
    // without an id, a workspace with no data) cannot re-trigger later.
    //
    // Note this still moves `useSearchParams` to null, which is why the
    // highlight's lifetime is held in a ref instead of this effect's cleanup.
    const url = new URL(window.location.href);
    url.searchParams.delete(FOCUS_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

    let highlighted: Element | null = null;
    let fadeTimer: number | undefined;

    // First match in document order. One category can produce several
    // leaderboard rows (per source and currency); sorted by amount, the first
    // is the largest, which is the one the insight was about.
    const stopWaiting = whenPresent(`[data-attention="${CSS.escape(targetId)}"]`, element => {
      highlighted = element;
      // Ring first, scroll second: starting the smooth scroll in the same tick
      // before the class lands leaves the outline transition stuck at its
      // transparent start value, so the ring never appears.
      element.classList.add(ATTENTION_CLASS);
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      fadeTimer = window.setTimeout(() => element.classList.remove(ATTENTION_CLASS), HIGHLIGHT_MS);
    });

    cleanupRef.current = () => {
      stopWaiting();
      window.clearTimeout(fadeTimer);
      highlighted?.classList.remove(ATTENTION_CLASS);
    };
  }, [targetId]);
}
