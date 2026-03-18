'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StatementCategoryRedirectPage() {
  const router = useRouter();
  const params = useParams<{ categoryId: string }>();

  useEffect(() => {
    const categoryId = params?.categoryId || 'uncategorized';
    router.replace(`/statements/top-categories?category=${encodeURIComponent(categoryId)}`);
  }, [params?.categoryId, router]);

  return null;
}
