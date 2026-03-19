'use client';

import { PRODUCT_TITLE, resolvePageTitle } from '@/app/lib/page-title';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DynamicPageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = resolvePageTitle(pathname || '/');
  }, [pathname]);

  useEffect(() => {
    return () => {
      document.title = PRODUCT_TITLE;
    };
  }, []);

  return null;
}
