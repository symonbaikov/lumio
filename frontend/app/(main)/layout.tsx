import type { ReactNode } from 'react';

import { AlertBanner } from '@/app/components/insights/AlertBanner';
import { MainSidePanelLayout } from '@/app/components/side-panel/MainSidePanelLayout';

export default function MainLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <MainSidePanelLayout>
      <AlertBanner />
      {children}
    </MainSidePanelLayout>
  );
}
