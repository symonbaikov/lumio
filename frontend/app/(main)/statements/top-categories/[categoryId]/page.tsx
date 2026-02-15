'use client';

import CategoryStatementsView from '@/app/(main)/statements/components/CategoryStatementsView';
import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';
import { useParams } from 'next/navigation';

export default function StatementCategoryPage() {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params?.categoryId || 'uncategorized';

  return (
    <>
      <StatementsSidePanel activeItem="top-categories" />
      <CategoryStatementsView categoryId={categoryId} />
    </>
  );
}
