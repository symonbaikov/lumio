/**
 * Types for the tours system
 */

import { type DriveStep, type PopoverDOM } from 'driver.js';

/**
 * Tour step
 */
export interface TourStep {
  /** CSS element selector */
  selector: string;
  /** If true, the step will be skipped if the element is not found in the DOM */
  optional?: boolean;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Side of popover placement relative to the element */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Popover alignment */
  align?: 'start' | 'center' | 'end';
  /** Highlight the element */
  highlight?: boolean;
  /** "Next" button text */
  nextButton?: string;
  /** "Back" button text */
  prevButton?: string;
  /** Show navigation buttons */
  showButtons?: boolean | string[];
  /** Callback when navigating to the next step */
  onNext?: () => void | Promise<void>;
  /** Callback when returning to the previous step */
  onPrev?: () => void | Promise<void>;
  /** Callback when destroying the step */
  onDestroy?: () => void;

  /**
   * Require user action to advance to the next step.
   * For example: user must click a button to open a menu.
   */
  advanceOn?: {
    /** CSS selector of the element to perform action on */
    selector: string;
    /** Event that triggers the transition (default: 'click') */
    event?: 'click';
    /** Delay before moving to the next step (ms) */
    delayMs?: number;
  };
}

/**
 * Tour configuration
 */
export interface TourConfig {
  /** Unique tour identifier */
  id: string;
  /** Tour name */
  name: string;
  /** Tour description */
  description: string;
  /** Tour steps */
  steps: TourStep[];
  /** URL of the page the tour is intended for */
  page?: string;
  /** Whether the tour can switch between pages */
  canNavigate?: boolean;
  /** Automatic start for new users */
  autoStart?: boolean;
  /** Required user role to show the tour */
  requiredRole?: 'admin' | 'member' | 'viewer';
}

/**
 * Tour progress
 */
export interface TourProgress {
  /** Tour ID */
  tourId: string;
  /** Current step (index) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Tour completed */
  completed: boolean;
  /** Start date (ISO string) */
  startedAt: string | Date;
  /** Completion date (ISO string) */
  completedAt?: string | Date;
  /** Skipped steps */
  skippedSteps: number[];
}

/**
 * Tour state in localStorage
 */
export interface TourState {
  /** Completed tours */
  completedTours: string[];
  /** Current tour progress */
  currentProgress?: TourProgress;
  /** Last interaction date */
  lastInteraction: string;
  /** Data schema version */
  version: string;
}

/**
 * Tour version
 */
export interface TourVersion {
  /** Version in semver format */
  version: string;
  /** Release date */
  released: Date;
  /** List of changes */
  changes: string[];
  /** Tour deprecated */
  deprecated?: boolean;
}

/**
 * Tour events for analytics
 */
export type TourEvent =
  | 'tour_started'
  | 'tour_step_viewed'
  | 'tour_step_skipped'
  | 'tour_completed'
  | 'tour_abandoned'
  | 'tour_resumed';

/**
 * Tour event data
 */
export interface TourEventData {
  tourId: string;
  userId?: string;
  stepIndex?: number;
  stepId?: string;
  duration?: number;
  timestamp: Date;
}

/**
 * Driver.js settings
 */
export interface TourDriverConfig {
  showProgress?: boolean;
  animate?: boolean;
  overlayClickNext?: boolean;
  allowClose?: boolean;
  showButtons?: string[];
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;
  closeBtnText?: string;
  progressText?: string;
}

/**
 * Extended step for Driver.js
 */
export interface ExtendedDriveStep extends Partial<DriveStep> {
  element: string | Element;
  popover: Partial<PopoverDOM> & {
    title: string;
    description: string;
  };
}
