/**
 * Component for automatic tour start on first page visit
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getTourManager } from '../TourManager';

export function TourAutoStarter() {
  const pathname = usePathname();
  const hasTriggeredRef = useRef<Set<string>>(new Set());
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

  const isOnCooldown = (tourId: string) => {
    try {
      const raw = localStorage.getItem(`lumio_tour_last_shown:${tourId}`);
      if (!raw) return false;
      const timestamp = Number(raw);
      if (Number.isNaN(timestamp)) return false;
      return Date.now() - timestamp < COOLDOWN_MS;
    } catch {
      return false;
    }
  };

  const markShown = (tourId: string) => {
    try {
      localStorage.setItem(`lumio_tour_last_shown:${tourId}`, Date.now().toString());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Prevent repeated launch for this page
    if (hasTriggeredRef.current.has(pathname)) return;

    const tourManager = getTourManager();
    let cancelled = false;

    const tryStart = (attemptsLeft: number) => {
      if (cancelled) return;
      if (hasTriggeredRef.current.has(pathname)) return;

      const allTours = tourManager.getAllTours();

      // If tours are not registered yet, quickly retry on next frames.
      if (allTours.length === 0) {
        if (attemptsLeft > 0) {
          window.requestAnimationFrame(() => tryStart(attemptsLeft - 1));
        }
        return;
      }

      const tourForCurrentPage = allTours.find(tour => {
        if (!tour.page) return false;
        return pathname.startsWith(tour.page);
      });

      if (!tourForCurrentPage) {
        // No tour for the current page.
        hasTriggeredRef.current.add(pathname);
        return;
      }

      if (
        tourManager.isTourCompleted(tourForCurrentPage.id) ||
        isOnCooldown(tourForCurrentPage.id)
      ) {
        hasTriggeredRef.current.add(pathname);
        return;
      }

      if (tourManager.isActive()) {
        return;
      }

      // Start without artificial delays (on the next frame — so DOM has time to render).
      hasTriggeredRef.current.add(pathname);
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        if (!tourManager.isActive()) {
          markShown(tourForCurrentPage.id);
          tourManager.startTour(tourForCurrentPage.id);
        }
      });
    };

    // ~1 sec of retries (60 frames) in case TourMenu hasn't registered tours yet.
    tryStart(60);

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
