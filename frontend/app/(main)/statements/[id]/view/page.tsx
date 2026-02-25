'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import TransactionsPageView from '@/app/components/transactions/TransactionsPageView';
import type { Category, StatementDetails, Transaction } from '@/app/components/transactions/types';
import api from '@/app/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { use, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

export default function ViewStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [statement, setStatement] = useState<StatementDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = use(params);
  const statementId = resolvedParams.id;

  const fetchData = async () => {
    if (!statementId) return;

    try {
      setLoading(true);

      // Fetch statement and transactions
      const [stmtResponse, categoriesResponse] = await Promise.all([
        api.get(`/storage/files/${statementId}`),
        api.get('/categories'),
      ]);

      const { statement: rawStatement, transactions: rawTransactions } = stmtResponse.data;

      // Transform statement to match StatementDetails interface
      const transformedStatement: StatementDetails = {
        id: rawStatement.id,
        fileName: rawStatement.fileName,
        bankName: rawStatement.bankName || rawStatement.parsingDetails?.detectedBank || 'Unknown',
        status: rawStatement.status,
        fileSize: rawStatement.fileSize || 0,
        createdAt: rawStatement.createdAt,
        metadata: {
          accountNumber: rawStatement.parsingDetails?.metadataExtracted?.accountNumber,
          period:
            rawStatement.statementDateFrom && rawStatement.statementDateTo
              ? `${new Date(rawStatement.statementDateFrom).toLocaleDateString()} - ${new Date(rawStatement.statementDateTo).toLocaleDateString()}`
              : undefined,
        },
        category: rawStatement.category,
        categoryId: rawStatement.categoryId,
      };

      // Transform transactions to match Transaction interface
      const transformedTransactions: Transaction[] = rawTransactions.map((tx: any) => ({
        id: tx.id,
        transactionDate: tx.transactionDate,
        documentNumber: tx.documentNumber,
        counterpartyName: tx.counterpartyName,
        counterpartyBin: tx.counterpartyBin,
        paymentPurpose: tx.paymentPurpose,
        debit: tx.debit || 0,
        credit: tx.credit || 0,
        amount: tx.debit ? -Math.abs(tx.debit) : Math.abs(tx.credit || 0),
        transactionType: tx.transactionType || (tx.debit ? 'expense' : 'income'),
        currency: tx.currency,
        exchangeRate: tx.exchangeRate,
        article: tx.article,
        amountForeign: tx.amountForeign,
        category: tx.category,
        branch: tx.branch,
        wallet: tx.wallet,
      }));

      setStatement(transformedStatement);
      setTransactions(transformedTransactions);
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не удалось загрузить данные выписки');
      toast.error('Не удалось загрузить данные выписки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statementId]);

  const handleUpdateCategory = async (txIds: string[], categoryId: string) => {
    try {
      await api.patch('/transactions/bulk-update-category', {
        transactionIds: txIds,
        categoryId,
      });
      // Reload data
      await fetchData();
    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const handleDownload = async () => {
    if (!statementId) return;
    const toastId = toast.loading('Загрузка файла...');
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${apiBaseUrl}/statements/edit`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = statement?.fileName || 'statement';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Файл загружен', { id: toastId });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Не удалось загрузить файл', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-full min-h-[320px] items-center justify-center">
          <LoadingAnimation size="lg" />
        </div>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 mb-4">
          {error || 'Выписка не найдена'}
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="container-shared h-full overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку выписок
        </button>
      </div>

      {/* Main Content */}
      <TransactionsPageView
        statement={statement}
        transactions={transactions}
        categories={categories}
        onUpdateCategory={handleUpdateCategory}
        onDownload={handleDownload}
        onReload={fetchData}
      />
    </div>
  );
}
