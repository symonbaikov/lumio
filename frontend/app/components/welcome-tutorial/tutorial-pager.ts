/** Intro, then one screen per step, then the outro. */
export type TutorialView = 'intro' | 'step' | 'outro';

export interface PagerState {
  view: TutorialView;
  /** Current step; meaningful only on the `step` view. */
  index: number;
}

export const INITIAL_PAGER: PagerState = { view: 'intro', index: 0 };

export function nextPage(state: PagerState, stepCount: number): PagerState {
  if (state.view === 'intro' && stepCount > 0) {
    return { view: 'step', index: 0 };
  }
  if (state.view === 'step' && state.index < stepCount - 1) {
    return { view: 'step', index: state.index + 1 };
  }
  return { view: 'outro', index: state.index };
}

export function previousPage(state: PagerState, stepCount: number): PagerState {
  if (state.view === 'outro' && stepCount > 0) {
    return { view: 'step', index: stepCount - 1 };
  }
  if (state.view === 'step' && state.index > 0) {
    return { view: 'step', index: state.index - 1 };
  }
  return INITIAL_PAGER;
}

/** How a step shows in the stepper: the current one, one already seen, or one ahead. */
export type StepperState = 'active' | 'done' | 'todo';

export function stepStateOf(index: number, current: number): StepperState {
  if (index === current) {
    return 'active';
  }
  return index < current ? 'done' : 'todo';
}

export function goToStep(index: number): PagerState {
  return { view: 'step', index };
}

/** Arrow keys turn the pages; right-to-left layouts turn them the other way. */
export function pageTurnOf(key: string, rtl: boolean): 'next' | 'back' | null {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') {
    return null;
  }
  return (key === 'ArrowRight') !== rtl ? 'next' : 'back';
}
