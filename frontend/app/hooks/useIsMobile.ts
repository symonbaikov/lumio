'use client';

import { useEffect, useMemo, useState } from 'react';

export type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

const getBreakpointFromMedia = (
  mobileMatches: boolean,
  tabletMatches: boolean,
): ViewportBreakpoint => {
  if (mobileMatches) {
    return 'mobile';
  }

  if (tabletMatches) {
    return 'tablet';
  }

  return 'desktop';
};

const getCurrentBreakpoint = (): ViewportBreakpoint => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }

  const mobile = window.matchMedia(MOBILE_QUERY);
  const tablet = window.matchMedia(TABLET_QUERY);

  return getBreakpointFromMedia(mobile.matches, tablet.matches);
};

const subscribeToMediaQuery = (
  mediaQuery: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) => {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }

  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
};

export function useBreakpoint(): ViewportBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ViewportBreakpoint>(() => getCurrentBreakpoint());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const tabletQuery = window.matchMedia(TABLET_QUERY);

    const updateBreakpoint = () => {
      setBreakpoint(getBreakpointFromMedia(mobileQuery.matches, tabletQuery.matches));
    };

    updateBreakpoint();

    const unsubscribeMobile = subscribeToMediaQuery(mobileQuery, updateBreakpoint);
    const unsubscribeTablet = subscribeToMediaQuery(tabletQuery, updateBreakpoint);

    return () => {
      unsubscribeMobile();
      unsubscribeTablet();
    };
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return useMemo(() => breakpoint === 'mobile', [breakpoint]);
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return useMemo(() => breakpoint === 'tablet', [breakpoint]);
}
