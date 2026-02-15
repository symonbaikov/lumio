'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidePanel, SidePanelProvider, useCurrentSidePanelConfig, useSidePanel } from './index';

function MainSidePanelLayoutInner({ children }: { children: React.ReactNode }) {
  const config = useCurrentSidePanelConfig();
  const sidePanel = useSidePanel();
  const pathname = usePathname();
  const isStatementsPage = pathname?.startsWith('/statements');

  React.useEffect(() => {
    if (sidePanel.position !== 'left') {
      sidePanel.setPosition('left');
    }
  }, [sidePanel]);

  const containerClassName = isStatementsPage
    ? 'flex min-h-[calc(100vh-var(--global-nav-height,0px))] h-[calc(100vh-var(--global-nav-height,0px))] overflow-hidden'
    : 'flex min-h-[calc(100vh-var(--global-nav-height,0px))]';

  const sidePanelWrapperClassName = isStatementsPage
    ? 'hidden lg:flex shrink-0 h-full'
    : 'hidden lg:flex shrink-0';

  const contentClassName = isStatementsPage ? 'flex-1 h-full overflow-hidden' : 'flex-1';

  return (
    <div className={containerClassName}>
      {config ? (
        <div className={sidePanelWrapperClassName}>
          <SidePanel config={config} className={isStatementsPage ? 'h-full' : undefined} />
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
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
      storageKey="lumio-side-panel"
    >
      <MainSidePanelLayoutInner>{children}</MainSidePanelLayoutInner>
    </SidePanelProvider>
  );
}
