'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import Link from 'next/link';
import type { DashboardTopCategory } from '@/app/hooks/useDashboard';

interface TopCategoriesCardProps {
  categories: DashboardTopCategory[];
  title: string;
  emptyLabel: string;
  formatAmount: (value: number) => string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function TopCategoriesCard({
  categories,
  title,
  emptyLabel,
  formatAmount,
}: TopCategoriesCardProps) {
  const maxAmount = categories[0]?.amount ?? 1;

  return (
    <Card className="border-gray-200/80 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category, index) => (
              <Link
                key={category.id ?? `${category.name}-${index}`}
                href={
                  category.id
                    ? `/statements?categoryId=${category.id}`
                    : '/statements?missingCategory=true'
                }
                className="block group"
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 group-hover:text-primary truncate max-w-[60%]">
                    {category.name}
                  </span>
                  <span className="font-semibold text-gray-900 shrink-0">
                    {formatAmount(category.amount)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(category.amount / maxAmount) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
