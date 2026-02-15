'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { ArrowLeft, FileText, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type StatementItem = {
  id: string;
  fileName: string;
  bankName?: string | null;
  totalTransactions?: number;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
};

type ReceiptItem = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  parsedData?: {
    amount?: number | string | null;
    currency?: string;
    vendor?: string;
    categoryId?: string;
  };
};

type Props = {
  categoryId: string;
};

const parseAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function CategoryStatementsView({ categoryId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const categoryNameRequest =
          categoryId === 'uncategorized'
            ? Promise.resolve({ data: { name: 'Uncategorized' } })
            : apiClient.get(`/categories/${categoryId}`);

        const [categoryResponse, statementsResponse, receiptsResponse] = await Promise.all([
          categoryNameRequest,
          apiClient.get('/statements', {
            params: {
              page: 1,
              limit: 100,
              categoryId,
            },
          }),
          gmailReceiptsApi.listReceipts({
            limit: 100,
            offset: 0,
            includeInvalid: false,
            hasAmount: true,
            categoryId,
          }),
        ]);

        if (!isMounted) return;

        const categoryTitle = categoryResponse.data?.name;
        setCategoryName(
          typeof categoryTitle === 'string' && categoryTitle.trim() ? categoryTitle : 'Category',
        );

        const statementRows = Array.isArray(statementsResponse.data?.data)
          ? statementsResponse.data.data
          : [];
        setStatements(statementRows);

        const receiptRows = Array.isArray(receiptsResponse.data?.receipts)
          ? receiptsResponse.data.receipts
          : [];
        setReceipts(receiptRows);
      } catch {
        if (isMounted) {
          setError('Failed to load data for this category');
          setStatements([]);
          setReceipts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategoryData();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  const statementCount = useMemo(() => statements.length, [statements]);
  const receiptCount = useMemo(() => receipts.length, [receipts]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <button
        type="button"
        onClick={() => router.push('/statements/top-categories')}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to categories
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{categoryName}</h1>
        <p className="text-sm text-gray-500">
          {statementCount} statements and {receiptCount} receipts linked to this category
        </p>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FileText className="h-4 w-4" />
          Statements ({statementCount})
        </div>

        {statementCount === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            No statements found for this category.
          </p>
        ) : (
          <div className="space-y-2">
            {statements.map(statement => {
              const amount = Math.max(
                parseAmount(statement.totalDebit),
                parseAmount(statement.totalCredit),
              );
              return (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => router.push(`/statements/${statement.id}/edit`)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {statement.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(statement.bankName || 'Unknown bank').toString()} -{' '}
                      {statement.totalTransactions || 0} transactions
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                    {formatMoney(amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Mail className="h-4 w-4" />
          Receipts ({receiptCount})
        </div>

        {receiptCount === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            No receipts found for this category.
          </p>
        ) : (
          <div className="space-y-2">
            {receipts.map(receipt => {
              const amount = parseAmount(receipt.parsedData?.amount);
              const title =
                receipt.parsedData?.vendor || receipt.subject || receipt.sender || 'Gmail receipt';
              return (
                <div
                  key={receipt.id}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500">{receipt.sender}</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                    {formatMoney(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
