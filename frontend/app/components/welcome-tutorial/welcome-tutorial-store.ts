'use client';

import { useSyncExternalStore } from 'react';

/**
 * Open state lives outside React, like the app panels, so the avatar menu and the
 * automatic first-visit open can both show the tutorial with a function call.
 */
let open = false;
// The tutorial opens by itself at most once per page load, even if its host
// remounts (the workspace switch remounts part of the tree).
let autoOpenClaimed = false;
const listeners = new Set<() => void>();

function emit(next: boolean): void {
  open = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openWelcomeTutorial(): void {
  emit(true);
}

export function closeWelcomeTutorial(): void {
  emit(false);
}

export function useWelcomeTutorialOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

/** True the first time only. */
export function claimAutoOpen(): boolean {
  if (autoOpenClaimed) {
    return false;
  }
  autoOpenClaimed = true;
  return true;
}
