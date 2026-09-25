'use client';

import type React from 'react';
import { useState } from 'react';
import {
  goToStep,
  INITIAL_PAGER,
  nextPage,
  type PagerState,
  pageTurnOf,
  previousPage,
} from './tutorial-pager';

export interface TutorialPager {
  state: PagerState;
  next: () => void;
  back: () => void;
  goTo: (index: number) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export function useTutorialPager(stepCount: number): TutorialPager {
  const [state, setState] = useState<PagerState>(INITIAL_PAGER);
  const next = (): void => setState(current => nextPage(current, stepCount));
  const back = (): void => setState(current => previousPage(current, stepCount));
  const onKeyDown = (event: React.KeyboardEvent): void => {
    const turn = pageTurnOf(event.key, document.documentElement.dir === 'rtl');
    if (turn) {
      event.preventDefault();
      (turn === 'next' ? next : back)();
    }
  };
  return { state, next, back, goTo: index => setState(goToStep(index)), onKeyDown };
}
