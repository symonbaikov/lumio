'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

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

  if (shouldHideChrome(pathname)) {
    return null;
  }

  // Desktop sidebar (hidden on mobile via CSS; the bottom bar menu replaces it there)
  return <Sidebar />;
}
