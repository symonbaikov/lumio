/**
 * React hook for working with tours
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getTourManager } from '../tours/TourManager';
import type { TourConfig } from '../tours/types';

export function useTour(tourId?: string) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize TourManager with navigation
  const tourManager = getTourManager({
    onNavigate: async (url: string) => {
      router.push(url);
      // Allow time for transition
      await new Promise(resolve => setTimeout(resolve, 300));
    },
  });

  // Check status on mount
  useEffect(() => {
    if (tourId) {
      setIsCompleted(tourManager.isTourCompleted(tourId));
    }
  }, [tourId, tourManager]);

  // Start tour
  const startTour = useCallback(
    (customTourId?: string) => {
      const id = customTourId || tourId;
      if (!id) {
        console.error('Tour ID is required');
        return;
      }

      tourManager.startTour(id);
      setIsActive(true);
    },
    [tourId, tourManager],
  );

  // Resume tour
  const resumeTour = useCallback(() => {
    const resumed = tourManager.resumeTour();
    if (resumed) {
      setIsActive(true);
    }
    return resumed;
  }, [tourManager]);

  // Stop tour
  const stopTour = useCallback(() => {
    tourManager.stopTour();
    setIsActive(false);
    setCurrentStep(null);
  }, [tourManager]);

  // Next step
  const nextStep = useCallback(() => {
    tourManager.nextStep();
  }, [tourManager]);

  // Previous step
  const previousStep = useCallback(() => {
    tourManager.previousStep();
  }, [tourManager]);

  // Reset tour progress
  const resetTour = useCallback(
    (customTourId?: string) => {
      const id = customTourId || tourId;
      if (id) {
        tourManager.resetTour(id);
        setIsCompleted(false);
      }
    },
    [tourId, tourManager],
  );

  // Update activity state
  useEffect(() => {
    const interval = setInterval(() => {
      const active = tourManager.isActive();
      const step = tourManager.getActiveStepIndex();

      setIsActive(active);
      setCurrentStep(step);

      if (!active && isActive) {
        // Tour just finished
        if (tourId) {
          setIsCompleted(tourManager.isTourCompleted(tourId));
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [tourManager, tourId, isActive]);

  return {
    startTour,
    resumeTour,
    stopTour,
    nextStep,
    previousStep,
    resetTour,
    isActive,
    currentStep,
    isCompleted,
    tourManager,
  };
}

/**
 * Hook for automatic tour start for new users
 */
export function useAutoTour(
  tourId: string,
  options?: {
    /** Condition for starting the tour */
    condition?: boolean;
    /** Delay before starting (ms) */
    delay?: number;
  },
) {
  const { startTour, isCompleted } = useTour(tourId);
  const { condition = true, delay = 1000 } = options || {};

  useEffect(() => {
    if (!isCompleted && condition) {
      const timer = setTimeout(() => {
        startTour();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isCompleted, condition, delay, startTour]);
}

/**
 * Hook for registering tours
 */
export function useRegisterTours(tours: TourConfig[]) {
  const tourManager = getTourManager();

  useEffect(() => {
    tourManager.registerTours(tours);
  }, [tours, tourManager]);
}

/**
 * Hook for getting list of all tours
 */
export function useAvailableTours() {
  const tourManager = getTourManager();
  const [tours, setTours] = useState<TourConfig[]>([]);

  useEffect(() => {
    setTours(tourManager.getAllTours());
  }, [tourManager]);

  return tours;
}
