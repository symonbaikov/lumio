'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar, { SidebarContent } from './Sidebar';

const SIDEBAR_OPEN_EVENT = 'lumio-sidebar-open';

function shouldHideChrome(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return (
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/chat')
  );
}

export default function AppChrome() {
  const pathname = usePathname();
  const hidden = shouldHideChrome(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => setMobileSidebarOpen(true);
    window.addEventListener(SIDEBAR_OPEN_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_OPEN_EVENT, handler);
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Desktop sidebar (sticky, hidden on mobile via CSS) */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      <div
        className={`lumio-sidebar-overlay${mobileSidebarOpen ? ' lumio-sidebar-overlay--visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar drawer */}
      <aside
        className={`lumio-shell__sidebar lumio-shell__sidebar--mobile${mobileSidebarOpen ? ' lumio-shell__sidebar--mobile-visible' : ''}`}
        aria-label="Navigation"
      >
        <SidebarContent onNavClick={() => setMobileSidebarOpen(false)} />
      </aside>
    </>
  );
}
