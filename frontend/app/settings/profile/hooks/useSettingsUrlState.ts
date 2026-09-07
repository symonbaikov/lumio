'use client';

import {
  LEGACY_HASH_TARGETS,
  type SettingsSectionId,
  type SettingsTabId,
  buildSettingsHref,
  parseSettingsSection,
  parseSettingsTab,
} from '@/app/settings/profile/helpers/settings-url-state';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export type UseSettingsUrlStateReturn = {
  activeTab: SettingsTabId;
  /** Panel to open on load; cleared as soon as the user switches tabs. */
  section: SettingsSectionId | null;
  setActiveTab: (tab: SettingsTabId) => void;
};

type State = { tab: SettingsTabId; section: SettingsSectionId | null };

/**
 * Active tab and panel live in the URL so a reload or shared link restores the
 * view. Switching writes the URL with `history.replaceState` rather than the
 * Next router: a router navigation would round-trip to the server for a page
 * whose content is entirely client-side.
 */
export function useSettingsUrlState(): UseSettingsUrlStateReturn {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>(() => {
    const tab = parseSettingsTab(searchParams?.get('tab'));
    return { tab, section: parseSettingsSection(tab, searchParams?.get('section')) };
  });

  // The sidebar era addressed panels by `#hash`; a server redirect cannot see
  // the fragment, so the translation has to happen here.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const target = hash ? LEGACY_HASH_TARGETS[hash] : undefined;
    if (target) {
      window.history.replaceState(null, '', buildSettingsHref(target.tab, target.section));
      setState({ tab: target.tab, section: target.section ?? null });
    }
  }, []);

  const setActiveTab = useCallback((tab: SettingsTabId): void => {
    window.history.replaceState(null, '', buildSettingsHref(tab));
    setState({ tab, section: null });
  }, []);

  return { activeTab: state.tab, section: state.section, setActiveTab };
}
