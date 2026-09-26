'use client';

import { usePathname } from 'next/navigation';
import {
  getStatementsActiveItem,
  useStatementsSidePanelConfig,
} from '@/app/(main)/statements/components/StatementsSidePanel';
import type { SidePanelPageConfig } from './side-panel';
import { SidePanel, useSidePanelConfig } from './side-panel';

// Compact but wide enough for the longest label ("Unapproved cash") plus a count.
const PANEL_WIDTH = 200;

// Phones have no column; on the queue pages they get the panel as
// MainSidePanelLayout's drawer and floating scan button, which read it from context.
function MobilePanelRegistrar({ config }: { config: SidePanelPageConfig }): null {
  useSidePanelConfig({ config, autoRegister: true });
  return null;
}

// Second sidebar, full height next to the main one: the statements work queue on
// every page. It is built here and rendered in the server HTML like the main
// sidebar (CSS hides it on narrow screens), so it is there from the first paint.
// One instance for the whole session, active item from the URL: switching pages
// neither remounts it nor reloads the counts.
export default function ShellSidePanel(): React.JSX.Element {
  const activeItem = getStatementsActiveItem(usePathname());
  const config = useStatementsSidePanelConfig(activeItem);

  return (
    <>
      {activeItem && <MobilePanelRegistrar config={config} />}
      <div className="lumio-shell__side-panel">
        <SidePanel
          config={config}
          width={PANEL_WIDTH}
          showCollapseToggle={false}
          style={{ height: '100%' }}
        />
      </div>
    </>
  );
}
