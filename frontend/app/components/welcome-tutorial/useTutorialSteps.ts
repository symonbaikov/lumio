'use client';

import { buildNavItems } from '@/app/components/navigation/helpers/navigation-config';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import { useExperimentalMode } from '@/app/lib/experimental-mode';
import { buildTutorialSteps, type TutorialStep } from './welcome-tutorial-steps';

/** The tutorial steps for the pages this user sees in the sidebar. */
export function useTutorialSteps(): TutorialStep[] {
  const { nav } = useIntlayer('navigation');
  const { hasPermission } = usePermissions();
  const experimentalMode = useExperimentalMode();
  // Same filter as the sidebar (Sidebar.tsx).
  const visible = buildNavItems(nav as Parameters<typeof buildNavItems>[0]).filter(
    item => hasPermission(item.permission) && (!item.experimental || experimentalMode),
  );
  return buildTutorialSteps(visible, id => nav[id].value);
}
