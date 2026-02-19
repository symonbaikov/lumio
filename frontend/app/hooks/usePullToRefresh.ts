'use client';

import { type TouchEvent, useCallback, useMemo, useRef, useState } from 'react';

type UsePullToRefreshOptions = {
  enabled?: boolean;
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  isAtTop?: () => boolean;
  onRefresh: () => Promise<void> | void;
};

type TouchHandlers = {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

const defaultIsAtTop = () => {
  if (typeof window === 'undefined') return false;
  return window.scrollY <= 0;
};

export function usePullToRefresh({
  enabled = true,
  threshold = 72,
  maxPull = 140,
  resistance = 0.45,
  isAtTop = defaultIsAtTop,
  onRefresh,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartYRef = useRef<number | null>(null);
  const pullActiveRef = useRef(false);

  const resetPullState = useCallback(() => {
    touchStartYRef.current = null;
    pullActiveRef.current = false;
    setPullDistance(0);
  }, []);

  const startPull = useCallback(
    (event: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      if (event.touches.length !== 1) return;
      if (!isAtTop()) return;

      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      pullActiveRef.current = touchStartYRef.current !== null;
    },
    [enabled, isRefreshing, isAtTop],
  );

  const movePull = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !pullActiveRef.current || touchStartYRef.current === null) return;

      const currentY = event.touches[0]?.clientY;
      if (typeof currentY !== 'number') return;

      const deltaY = currentY - touchStartYRef.current;

      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      if (!isAtTop() && pullDistance <= 0) {
        resetPullState();
        return;
      }

      event.preventDefault();

      const next = Math.min(maxPull, deltaY * resistance);
      setPullDistance(next);
    },
    [enabled, isAtTop, maxPull, pullDistance, resetPullState, resistance],
  );

  const completePull = useCallback(async () => {
    if (!enabled || !pullActiveRef.current) {
      resetPullState();
      return;
    }

    const shouldRefresh = pullDistance >= threshold;
    resetPullState();

    if (!shouldRefresh || isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, isRefreshing, onRefresh, pullDistance, resetPullState, threshold]);

  const handlers = useMemo<TouchHandlers>(
    () => ({
      onTouchStart: startPull,
      onTouchMove: movePull,
      onTouchEnd: () => {
        void completePull();
      },
      onTouchCancel: resetPullState,
    }),
    [startPull, movePull, completePull, resetPullState],
  );

  return {
    handlers,
    pullDistance,
    isRefreshing,
    isReadyToRefresh: pullDistance >= threshold,
  };
}
