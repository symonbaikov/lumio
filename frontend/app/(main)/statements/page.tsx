'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StatementsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/statements/submit');
  }, [router]);

  return null;
}
