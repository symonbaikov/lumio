'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoriesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspaces/categories');
  }, [router]);

  return null;
}
