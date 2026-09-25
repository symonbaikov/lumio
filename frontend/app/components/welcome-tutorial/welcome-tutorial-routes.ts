import { isNavItemActive } from '@/app/components/navigation/helpers/navigation-config';
import type { User } from '@/app/contexts/AuthContext';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';

/** Tutorial steps in sidebar order: `id` is the page's key in the `nav` dictionary. */
export const TUTORIAL_PAGES = [
  { id: 'dashboard', path: DEFAULT_APP_ROUTE },
  { id: 'statements', path: '/statements' },
  { id: 'tables', path: '/custom-tables' },
  { id: 'workspaces', path: '/workspaces' },
  { id: 'reports', path: '/reports' },
  { id: 'taxDeclaration', path: '/tax-declaration' },
  { id: 'netWorth', path: '/net-worth' },
  { id: 'budgets', path: '/budgets' },
  { id: 'advice', path: '/advice' },
  { id: 'goals', path: '/goals' },
  { id: 'roi', path: '/roi' },
  { id: 'subscriptions', path: '/subscriptions' },
  { id: 'crypto', path: '/crypto' },
] as const;

export type TutorialStepId = (typeof TUTORIAL_PAGES)[number]['id'];

/** Only the sidebar pages: never over onboarding, an invitation or a shared link. */
export function isTutorialRoute(pathname: string): boolean {
  return TUTORIAL_PAGES.some(page => isNavItemActive(pathname, page.path));
}

/**
 * A new account: it finished onboarding and the server says the tutorial was
 * never closed. `undefined` means a user object without the field, which must
 * never count as "not seen".
 */
export function isNewAccount(user: User | null): boolean {
  return Boolean(user?.onboardingCompletedAt) && user?.welcomeTutorialSeenAt === null;
}

export function isWelcomeTutorialEligible(options: {
  user: User | null;
  loading: boolean;
  pathname: string | null;
}): boolean {
  if (options.loading || !options.pathname) {
    return false;
  }
  return isNewAccount(options.user) && isTutorialRoute(options.pathname);
}
