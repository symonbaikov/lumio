import type { ReactNode } from 'react';

import { MainSidePanelLayout } from '@/app/components/side-panel/MainSidePanelLayout';

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainSidePanelLayout>{children}</MainSidePanelLayout>;
}
