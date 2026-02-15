'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import apiClient from '@/app/lib/api';
import { ChevronRight, Folder } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type TopCategoryItem = {
  id: string | null;
  name: string;
  amount: number;
  transactions: number;
  percentage: number;
};

type TopCategoryApiItem = {
  id: string | null;
  name: string;
  amount: number;
  transactions: number;
  percentage: number;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function CategoriesListView() {
  const router = useRouter();
  const [categories, setCategories] = useState<TopCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get('/reports/top-categories', {
          params: {
            type: 'expense',
            limit: 100,
          },
        });

        const rawCategories = Array.isArray(response.data?.categories)
          ? response.data.categories
          : [];
        const mapped: TopCategoryItem[] = (rawCategories as TopCategoryApiItem[]).map(category => ({
          id: category.id ?? null,
          name: category.name,
          amount: Number(category.amount) || 0,
          transactions: Number(category.transactions) || 0,
          percentage: Number(category.percentage) || 0,
        }));

        mapped.sort((left, right) => {
          if (right.transactions !== left.transactions) {
            return right.transactions - left.transactions;
          }
          if (right.amount !== left.amount) {
            return right.amount - left.amount;
          }
          return left.name.localeCompare(right.name);
        });

        if (isMounted) {
          setCategories(mapped);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load categories');
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasData = useMemo(() => categories.length > 0, [categories]);

  const openCategory = (categoryId: string | null) => {
    router.push(`/statements/top-categories/${categoryId ?? 'uncategorized'}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Folder className="h-9 w-9 text-gray-300" />
          <p className="text-sm text-gray-500">No categories yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Top categories</h1>
        <p className="text-sm text-gray-500">Most assigned categories in your workspace</p>
      </div>

      <div className="space-y-2">
        {categories.map((category, index) => (
          <button
            key={category.id ?? `uncategorized-${category.name}`}
            type="button"
            onClick={() => openCategory(category.id)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {index + 1}. {category.name}
              </p>
              <p className="text-xs text-gray-500">
                {category.transactions} items - {category.percentage.toFixed(1)}%
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                {formatMoney(category.amount)}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
