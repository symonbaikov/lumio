'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function StatementsPage(): null {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextParams.get('upload') === '1' && !nextParams.get('openExpenseDrawer')) {
      nextParams.set('openExpenseDrawer', 'scan');
    }
    nextParams.delete('upload');
    const query = nextParams.toString();
    router.replace(query ? `/statements/submit?${query}` : '/statements/submit');
  }, [router, searchParams]);

  return null;
}
