'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CategoriesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspaces/categories');
  }, [router]);

  return null;
}
