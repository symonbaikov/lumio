'use client';

import CategoriesListView from '@/app/(main)/statements/components/CategoriesListView';
import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';

export default function StatementsTopCategoriesPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-categories" />
      <CategoriesListView />
    </>
  );
}
