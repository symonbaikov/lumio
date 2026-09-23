'use client';

import type React from 'react';
import { IntegrationsPanel } from '@/app/integrations/panel/IntegrationsPanel';
import { PluginsPanel } from '@/app/plugins/panel/PluginsPanel';

/**
 * The integrations and plugins panels, mounted once for the whole app so any
 * entry point can open them over the page the user is already on.
 */
export function AppPanels(): React.JSX.Element {
  return (
    <>
      <IntegrationsPanel />
      <PluginsPanel />
    </>
  );
}
