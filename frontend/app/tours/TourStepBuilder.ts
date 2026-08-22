/**
 * Tour step builder - converts TourStep[] to DriveStep[]
 */

import type { AllowedButtons, DriveStep } from 'driver.js';
import { resolveText } from './TourManagerHelpers';
import type { TourStep } from './types';

type AdvanceCallback = () => void;
type DetachSetter = (fn: (() => void) | null) => void;

interface ClickAdvanceConfig {
  step: TourStep;
  index: number;
  advance: AdvanceCallback;
  setDetach: DetachSetter;
}

function attachClickAdvance({ step, index, advance, setDetach }: ClickAdvanceConfig): void {
  if (!step.advanceOn) {
    return;
  }

  const eventName = step.advanceOn.event ?? 'click';
  if (eventName !== 'click') {
    return;
  }

  const target = document.querySelector(step.advanceOn.selector);
  if (!target) {
    console.warn(`advanceOn target not found for step ${index + 1}: ${step.advanceOn.selector}`);
    return;
  }

  const delay = step.advanceOn.delayMs ?? 0;
  const onClick = (): void => {
    setDetach(null);
    if (delay > 0) {
      window.setTimeout(advance, delay);
    } else {
      advance();
    }
  };

  target.addEventListener('click', onClick, { once: true } as AddEventListenerOptions);
  setDetach((): void => {
    try {
      target.removeEventListener('click', onClick);
    } catch {
      // noop
    }
  });
}

export interface StepContext {
  lastStepIndex: { value: number };
  moveNext: () => void;
  movePrevious: () => void;
  updateProgress: (index: number) => void;
  trackStep: (index: number) => void;
}

function buildStepHandlers(
  step: TourStep,
  index: number,
  ctx: StepContext,
): { onHighlighted: () => void; onDeselected: () => void } {
  let detachAdvanceListener: (() => void) | null = null;
  const setDetach: DetachSetter = (fn): void => {
    detachAdvanceListener = fn;
  };

  const advance = (): void => {
    ctx.updateProgress(index + 1);
    ctx.trackStep(index + 1);
    ctx.moveNext();
  };

  const onHighlighted = (): void => {
    ctx.lastStepIndex.value = index;

    if (step.optional) {
      const maybeElement = document.querySelector(step.selector);
      if (!maybeElement) {
        window.setTimeout(advance, 0);
        return;
      }
    }

    attachClickAdvance({ step, index, advance, setDetach });
  };

  const onDeselected = (): void => {
    if (detachAdvanceListener) {
      detachAdvanceListener();
      detachAdvanceListener = null;
    }
    if (step.onDestroy) {
      step.onDestroy();
    }
  };

  return { onHighlighted, onDeselected };
}

function buildPopover(
  step: TourStep,
  advance: AdvanceCallback,
  movePrevious: () => void,
  centered = false,
): DriveStep['popover'] {
  const onNextClick = (): void => {
    const result = step.onNext ? step.onNext() : undefined;
    if (result instanceof Promise) {
      result.then(advance).catch(() => advance());
    } else {
      advance();
    }
  };

  const onPrevClick = (): void => {
    const result = step.onPrev ? step.onPrev() : undefined;
    if (result instanceof Promise) {
      result.then(movePrevious).catch(() => movePrevious());
    } else {
      movePrevious();
    }
  };

  return {
    title: resolveText(step.title),
    description: resolveText(step.description),
    side: step.side ?? 'bottom',
    align: step.align ?? 'start',
    ...(centered ? { popoverClass: 'tour-popover tour-popover--centered' } : {}),
    ...(Array.isArray(step.showButtons)
      ? { showButtons: step.showButtons as AllowedButtons[] }
      : {}),
    onNextClick,
    onPrevClick,
  };
}

export function buildDriveStep(step: TourStep, index: number, ctx: StepContext): DriveStep {
  const { onHighlighted, onDeselected } = buildStepHandlers(step, index, ctx);

  let advanceFn: AdvanceCallback = () => {};
  const captureAdvance = (fn: AdvanceCallback): void => {
    advanceFn = fn;
  };

  // Rebuild advance for popover (same logic as inside buildStepHandlers)
  const advance = (): void => {
    ctx.updateProgress(index + 1);
    ctx.trackStep(index + 1);
    ctx.moveNext();
  };
  captureAdvance(advance);

  const isCentered = !step.selector || step.selector === 'body';
  return {
    ...(isCentered ? {} : { element: step.selector }),
    onHighlighted,
    onDeselected,
    popover: buildPopover(step, advanceFn, ctx.movePrevious, isCentered),
  } as DriveStep;
}
