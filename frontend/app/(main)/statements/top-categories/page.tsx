'use client';

import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';
import TopCategoriesView from '@/app/(main)/statements/components/TopCategoriesView';

export default function StatementsTopCategoriesPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-categories" />
      <TopCategoriesView />
    </>
  );
}
