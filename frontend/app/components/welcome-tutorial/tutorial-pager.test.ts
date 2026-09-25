import { describe, expect, it } from 'vitest';
import {
  goToStep,
  INITIAL_PAGER,
  nextPage,
  pageTurnOf,
  previousPage,
  stepStateOf,
} from './tutorial-pager';

describe('tutorial pager', () => {
  it('goes from the intro through every step to the outro', () => {
    let state = INITIAL_PAGER;
    const seen: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      state = nextPage(state, 3);
      seen.push(state.view === 'step' ? `step ${state.index}` : state.view);
    }
    expect(seen).toEqual(['step 0', 'step 1', 'step 2', 'outro']);
  });

  it('stays on the outro when asked to go further', () => {
    expect(nextPage({ view: 'outro', index: 2 }, 3)).toEqual({ view: 'outro', index: 2 });
  });

  it('goes back from the outro to the last step, and from the first step to the intro', () => {
    expect(previousPage({ view: 'outro', index: 2 }, 3)).toEqual({ view: 'step', index: 2 });
    expect(previousPage({ view: 'step', index: 1 }, 3)).toEqual({ view: 'step', index: 0 });
    expect(previousPage({ view: 'step', index: 0 }, 3)).toEqual(INITIAL_PAGER);
  });

  it('skips straight to the outro when no step is visible', () => {
    expect(nextPage(INITIAL_PAGER, 0)).toEqual({ view: 'outro', index: 0 });
    expect(previousPage({ view: 'outro', index: 0 }, 0)).toEqual(INITIAL_PAGER);
  });

  it('jumps to a step', () => {
    expect(goToStep(5)).toEqual({ view: 'step', index: 5 });
  });

  it('marks steps before the current one as done', () => {
    expect([0, 1, 2].map(index => stepStateOf(index, 1))).toEqual(['done', 'active', 'todo']);
  });
});

describe('pageTurnOf', () => {
  it('turns pages with the arrow keys', () => {
    expect(pageTurnOf('ArrowRight', false)).toBe('next');
    expect(pageTurnOf('ArrowLeft', false)).toBe('back');
  });

  it('reverses them right to left', () => {
    expect(pageTurnOf('ArrowRight', true)).toBe('back');
    expect(pageTurnOf('ArrowLeft', true)).toBe('next');
  });

  it('ignores other keys', () => {
    expect(pageTurnOf('Enter', false)).toBeNull();
  });
});
