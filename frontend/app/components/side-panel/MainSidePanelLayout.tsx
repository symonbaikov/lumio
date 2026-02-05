'use client';

import React from 'react';
import { SidePanel, SidePanelProvider, useCurrentSidePanelConfig, useSidePanel } from './index';

function MainSidePanelLayoutInner({ children }: { children: React.ReactNode }) {
  const config = useCurrentSidePanelConfig();
  const sidePanel = useSidePanel();

  React.useEffect(() => {
    if (sidePanel.position !== 'left') {
      sidePanel.setPosition('left');
    }
  }, [sidePanel]);

  return (
    <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))]">
      {config ? (
        <div className="hidden lg:flex shrink-0">
          <SidePanel config={config} />
        </div>
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function MainSidePanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidePanelProvider
      defaultWidth="md"
      defaultPosition="left"
      defaultCollapsed={false}
      persistState={true}
      storageKey="finflow-side-panel"
    >
      <MainSidePanelLayoutInner>{children}</MainSidePanelLayoutInner>
    </SidePanelProvider>
  );
}
