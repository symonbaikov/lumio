/**
 * Tour Manager - manages launching, navigation and state of tours
 */

import { type DriveStep, type Driver, driver } from 'driver.js';
import {
  type TourConfig,
  type TourDriverConfig,
  type TourProgress,
  type TourState,
  type TourStep,
} from './types';

const TOUR_STORAGE_KEY = 'lumio_tour_state';
const TOUR_STATE_VERSION = '1.0.0';

function getPreferredLang(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang;
    if (lang) return lang;
  }
  return 'ru';
}

function resolveText(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input == null) return '';

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;

    // react-intlayer wraps primitives into a Proxy of a ReactElement.
    // The Proxy exposes `.value` via a getter trap, so `'value' in record` is false.
    const maybeValue = (record as any).value;
    if (typeof maybeValue !== 'undefined') {
      return resolveText(maybeValue);
    }

    // Dictionary JSON shape: { nodeType: 'translation', translation: { ru: ..., en: ... } }
    if (
      record.nodeType === 'translation' &&
      typeof record.translation === 'object' &&
      record.translation
    ) {
      const lang = getPreferredLang();
      const translation = record.translation as Record<string, unknown>;
      return resolveText(translation[lang] ?? translation.ru ?? Object.values(translation)[0]);
    }

    // Plain locale map shape: { ru: '...', en: '...' }
    if ('ru' in record || 'en' in record || 'kk' in record) {
      const lang = getPreferredLang();
      return resolveText(record[lang] ?? record.ru ?? record.en ?? record.kk);
    }
  }

  return String(input);
}

export class TourManager {
  private driverInstance!: Driver;
  private currentTour: TourConfig | null = null;
  private registeredTours: Map<string, TourConfig> = new Map();
  private onNavigate?: (url: string) => Promise<void>;
  private isDestroying = false;
  private lastStepIndex = -1;
  private actualStepsCount = 0;
  private dismissOnClick?: (event: MouseEvent) => void;
  private dismissOnVisibilityChange?: () => void;

  constructor(options?: { onNavigate?: (url: string) => Promise<void> }) {
    this.onNavigate = options?.onNavigate;

    // Initialize Driver.js with base settings
    this.resetDriver();
  }

  private resetDriver(overrides?: TourDriverConfig) {
    if (this.driverInstance?.isActive()) {
      this.driverInstance.destroy();
    }

    this.driverInstance = driver({
      showProgress: overrides?.showProgress ?? true,
      animate: overrides?.animate ?? true,
      allowClose: overrides?.allowClose ?? true,
      showButtons: overrides?.showButtons as any,
      popoverClass: 'tour-popover',
      progressText: overrides?.progressText ?? '{{current}} of {{total}}',
      nextBtnText: overrides?.nextBtnText ?? 'Next',
      prevBtnText: overrides?.prevBtnText ?? 'Back',
      doneBtnText: overrides?.doneBtnText ?? 'Done',
      onHighlighted: () => {
        // Save current index on each step
        this.lastStepIndex = this.driverInstance.getActiveIndex() ?? -1;
      },
      onDestroyed: () => {
        this.handleTourDestroyed();
      },
    });
  }

  /**
   * Register a tour
   */
  registerTour(tour: TourConfig): void {
    this.registeredTours.set(tour.id, tour);
  }

  /**
   * Register multiple tours
   */
  registerTours(tours: TourConfig[]): void {
    tours.forEach(tour => this.registerTour(tour));
  }

  /**
   * Get registered tour
   */
  getTour(tourId: string): TourConfig | undefined {
    return this.registeredTours.get(tourId);
  }

  /**
   * Get all registered tours
   */
  getAllTours(): TourConfig[] {
    return Array.from(this.registeredTours.values());
  }

  /**
   * Start tour
   */
  async startTour(
    tourId: string,
    startFromStep = 0,
    driverConfig?: TourDriverConfig,
  ): Promise<void> {
    // Check if another tour is already running
    if (this.driverInstance.isActive()) {
      console.warn('Another tour is already active');
      return;
    }

    const tour = this.registeredTours.get(tourId);

    if (!tour) {
      console.error(`Tour with id "${tourId}" not found`);
      return;
    }

    // Reset flags before a new tour
    this.isDestroying = false;
    this.lastStepIndex = -1;
    this.currentTour = tour;

    if (driverConfig) {
      this.resetDriver(driverConfig);
    }

    // Transform steps to Driver.js format with filtering
    const driveSteps = this.convertToDriverSteps(tour.steps);

    if (driveSteps.length === 0) {
      console.warn('No valid steps found for tour:', tourId);
      this.currentTour = null;
      return;
    }

    // Save actual steps count
    this.actualStepsCount = driveSteps.length;

    // Save initial progress
    this.saveProgress({
      tourId: tour.id,
      currentStep: startFromStep,
      totalSteps: this.actualStepsCount,
      completed: false,
      startedAt: new Date().toISOString(),
      skippedSteps: [],
    });

    try {
      // Start tour
      this.driverInstance.setSteps(driveSteps);
      this.driverInstance.drive(startFromStep);
      this.attachDismissListeners();

      // Analytics
      this.trackEvent('tour_started', { tourId: tour.id });
    } catch (error) {
      console.error('Failed to start tour:', error);
      this.currentTour = null;
    }
  }

  /**
   * Resume tour from saved position
   */
  resumeTour(): boolean {
    const state = this.loadState();

    if (!state?.currentProgress || state.currentProgress.completed) {
      return false;
    }

    const { tourId, currentStep } = state.currentProgress;
    this.startTour(tourId, currentStep);
    this.trackEvent('tour_resumed', { tourId });

    return true;
  }

  /**
   * Stop current tour
   */
  stopTour(): void {
    if (this.currentTour) {
      this.trackEvent('tour_abandoned', {
        tourId: this.currentTour.id,
        stepIndex: this.lastStepIndex,
      });
    }

    try {
      if (this.driverInstance.isActive()) {
        this.detachDismissListeners();
        this.driverInstance.destroy();
      }
    } catch (error) {
      console.error('Error destroying driver:', error);
    }

    this.currentTour = null;
    this.isDestroying = false;
    this.lastStepIndex = -1;
    this.actualStepsCount = 0;
  }

  /**
   * Next step
   */
  nextStep(): void {
    this.driverInstance.moveNext();
  }

  /**
   * Previous step
   */
  previousStep(): void {
    this.driverInstance.movePrevious();
  }

  /**
   * Check if tour is active
   */
  isActive(): boolean {
    return this.driverInstance.isActive();
  }

  /**
   * Get active step index
   */
  getActiveStepIndex(): number | null {
    const index = this.driverInstance.getActiveIndex();
    return index !== undefined ? index : null;
  }

  /**
   * Check if tour is completed
   */
  isTourCompleted(tourId: string): boolean {
    const state = this.loadState();
    return state?.completedTours.includes(tourId) ?? false;
  }

  /**
   * Reset tour progress
   */
  resetTour(tourId: string): void {
    const state = this.loadState();
    if (state) {
      state.completedTours = state.completedTours.filter(id => id !== tourId);
      if (state.currentProgress?.tourId === tourId) {
        state.currentProgress = undefined;
      }
      this.saveState(state);
    }
  }

  /**
   * Transform tour steps to Driver.js format
   */
  private convertToDriverSteps(steps: TourStep[]): DriveStep[] {
    return steps.map((step, index) => {
      let detachAdvanceListener: (() => void) | null = null;

      const advance = () => {
        // Save progress
        this.updateProgress(index + 1);

        // Tracking
        this.trackEvent('tour_step_viewed', {
          tourId: this.currentTour?.id ?? '',
          stepIndex: index + 1,
        });

        this.driverInstance.moveNext();
      };

      return {
        // Important: pass selector as string so steps can highlight dynamic elements
        // (e.g. dropdown menu elements that appear after click).
        element: step.selector,
        onHighlighted: () => {
          // More reliable than driver.getActiveIndex(): sometimes index doesn't update
          // before onHighlighted is called, causing the tour not to count.
          this.lastStepIndex = index;

          if (step.optional) {
            const maybeElement = document.querySelector(step.selector);
            if (!maybeElement) {
              window.setTimeout(() => advance(), 0);
              return;
            }
          }

          if (!step.advanceOn) return;

          // Only 'click' supported for now
          const eventName = step.advanceOn.event ?? 'click';
          if (eventName !== 'click') return;

          const target = document.querySelector(step.advanceOn.selector);
          if (!target) {
            console.warn(
              `advanceOn target not found for step ${index + 1}: ${step.advanceOn.selector}`,
            );
            return;
          }

          const onClick = () => {
            detachAdvanceListener?.();
            detachAdvanceListener = null;

            const delay = step.advanceOn?.delayMs ?? 0;
            if (delay > 0) {
              window.setTimeout(() => advance(), delay);
            } else {
              advance();
            }
          };

          target.addEventListener('click', onClick, {
            once: true,
          } as AddEventListenerOptions);
          detachAdvanceListener = () => {
            try {
              target.removeEventListener('click', onClick as any);
            } catch {
              // noop
            }
          };
        },
        onDeselected: () => {
          if (detachAdvanceListener) {
            detachAdvanceListener();
            detachAdvanceListener = null;
          }
          if (step.onDestroy) {
            step.onDestroy();
          }
        },
        popover: {
          title: resolveText(step.title),
          description: resolveText(step.description),
          side: step.side ?? 'bottom',
          align: step.align ?? 'start',
          ...(Array.isArray(step.showButtons) ? { showButtons: step.showButtons } : {}),
          onNextClick: async () => {
            if (step.onNext) {
              await step.onNext();
            }

            advance();
          },
          onPrevClick: async () => {
            if (step.onPrev) {
              await step.onPrev();
            }
            this.driverInstance.movePrevious();
          },
        },
      } as DriveStep;
    });
  }

  /**
   * Check element visibility
   */
  private isElementVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  /**
   * Tour destruction/close handler
   */
  private handleTourDestroyed(): void {
    if (!this.currentTour || this.isDestroying) return;

    this.isDestroying = true;
    const tourId = this.currentTour.id;
    this.detachDismissListeners();
    const state = this.loadState();
    const progressIndex =
      state?.currentProgress?.tourId === tourId ? state.currentProgress.currentStep : undefined;
    const completedByProgress =
      typeof progressIndex === 'number' &&
      this.actualStepsCount > 0 &&
      progressIndex >= this.actualStepsCount - 1;

    console.log('[TourManager] Tour destroyed:', {
      tourId,
      lastStepIndex: this.lastStepIndex,
      actualStepsCount: this.actualStepsCount,
      isLastStep: this.lastStepIndex === this.actualStepsCount - 1,
      progressIndex,
    });

    // If we were on the last step - tour is completed
    // Compare with actualStepsCount, not the original number of steps
    if (
      (this.lastStepIndex >= this.actualStepsCount - 1 || completedByProgress) &&
      this.actualStepsCount > 0
    ) {
      this.markTourCompleted(tourId);
      this.trackEvent('tour_completed', { tourId });
    }

    this.currentTour = null;
    this.isDestroying = false;
    this.lastStepIndex = -1;
    this.actualStepsCount = 0;
  }

  private attachDismissListeners(): void {
    if (this.dismissOnClick || this.dismissOnVisibilityChange) return;
    this.dismissOnClick = event => {
      if (!this.driverInstance.isActive()) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('.driver-popover')) return;
      this.stopTour();
    };
    this.dismissOnVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && this.driverInstance.isActive()) {
        this.stopTour();
      }
    };
    document.addEventListener('click', this.dismissOnClick, true);
    document.addEventListener('visibilitychange', this.dismissOnVisibilityChange);
  }

  private detachDismissListeners(): void {
    if (this.dismissOnClick) {
      document.removeEventListener('click', this.dismissOnClick, true);
      this.dismissOnClick = undefined;
    }
    if (this.dismissOnVisibilityChange) {
      document.removeEventListener('visibilitychange', this.dismissOnVisibilityChange);
      this.dismissOnVisibilityChange = undefined;
    }
  }

  /**
   * Mark tour as completed
   */
  private markTourCompleted(tourId: string): void {
    const state = this.loadState() ?? this.getDefaultState();

    if (!state.completedTours.includes(tourId)) {
      state.completedTours.push(tourId);
    }

    if (state.currentProgress?.tourId === tourId) {
      state.currentProgress.completed = true;
      state.currentProgress.completedAt = new Date().toISOString();
    }

    this.saveState(state);

    // Log for debugging
    console.log('[TourManager] Tour completed:', tourId);
    console.log('[TourManager] Completed tours:', state.completedTours);
  }

  /**
   * Update tour progress
   */
  private updateProgress(stepIndex: number): void {
    const state = this.loadState();

    if (state?.currentProgress && this.currentTour) {
      state.currentProgress.currentStep = stepIndex;
      this.saveState(state);
    }
  }

  /**
   * Save tour progress
   */
  private saveProgress(progress: TourProgress): void {
    const state = this.loadState() ?? this.getDefaultState();
    // Transform Date to ISO string for correct serialization
    const serializedProgress = {
      ...progress,
      startedAt:
        progress.startedAt instanceof Date ? progress.startedAt.toISOString() : progress.startedAt,
      completedAt:
        progress.completedAt instanceof Date
          ? progress.completedAt.toISOString()
          : progress.completedAt,
    };
    state.currentProgress = serializedProgress as any;
    this.saveState(state);
  }

  /**
   * Load state from localStorage
   */
  private loadState(): TourState | null {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as TourState;

      // Version check
      if (state.version !== TOUR_STATE_VERSION) {
        console.warn('Tour state version mismatch, resetting');
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load tour state:', error);
      return null;
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(state: TourState): void {
    try {
      state.lastInteraction = new Date().toISOString();
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save tour state:', error);
    }
  }

  /**
   * Get default state
   */
  private getDefaultState(): TourState {
    return {
      completedTours: [],
      lastInteraction: new Date().toISOString(),
      version: TOUR_STATE_VERSION,
    };
  }

  /**
   * Send analytics event
   */
  private trackEvent(event: string, data: Partial<{ tourId: string; stepIndex?: number }>): void {
    // Integration with analytics system
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }

    // Can add console.log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Tour Analytics] ${event}:`, data);
    }
  }

  /**
   * Clear all tour data
   */
  clearAllData(): void {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }
}

// Singleton instance
let tourManagerInstance: TourManager | null = null;

/**
 * Get global TourManager instance
 */
export function getTourManager(options?: {
  onNavigate?: (url: string) => Promise<void>;
}): TourManager {
  if (!tourManagerInstance) {
    tourManagerInstance = new TourManager(options);
  }
  return tourManagerInstance;
}
