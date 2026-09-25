'use client';

import { useEffect } from 'react';
import { TITLE_ID } from './welcome-tutorial.styles';

/**
 * Moves focus to the heading of a screen when the screen appears. The button that led
 * there (Start, Next on the last step, Back on the outro) is gone by then, and a focused
 * heading is also what a screen reader announces.
 */
export function useFocusTitleOnMount(): void {
  useEffect(() => {
    document.getElementById(TITLE_ID)?.focus();
  }, []);
}
