'use client';
import { formatStoredDate } from '@/app/lib/user-format-store';

import { ArrowLeft } from '@/app/components/icons';
import TransactionsPageView from '@/app/components/transactions/TransactionsPageView';
import type { Category, StatementDetails, Transaction } from '@/app/components/transactions/types';
import { useIntlayer } from '@/app/i18n';
import api, { apiBaseUrl } from '@/app/lib/api';
import Skeleton from '@mui/material/Skeleton';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface RawStatement {
  id: string;
  fileName: string;
  bankName?: string | null;
  parsingDetails?: {
    detectedBank?: string;
    metadataExtracted?: {
      accountNumber?: string;
    };
  };
  status: string;
  fileSize?: number | null;
  createdAt: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  category?: StatementDetails['category'];
  categoryId?: string | null;
}

interface RawTransaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  paymentPurpose: string;
  debit?: number | null;
  credit?: number | null;
  transactionType?: string;
  currency?: string;
  exchangeRate?: number;
  article?: string;
  amountForeign?: number;
  category?: Transaction['category'];
  branch?: Transaction['branch'];
  wallet?: Transaction['wallet'];
  splitGroupId?: string | null;
  splitIndex?: number | null;
}

interface StatementViewResponse {
  statement: RawStatement;
  transactions: RawTransaction[];
}

function ViewStatementSkeleton(): React.JSX.Element {
  return (
    <div
      className="container-shared"
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', padding: '32px 16px' }}
    >
      <div style={{ marginBottom: 24 }}>
        <Skeleton variant="text" width={160} height={24} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Skeleton variant="text" width={320} height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={20} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton variant="text" width="50%" height={16} />
            <Skeleton variant="text" width="70%" height={28} />
          </div>
        ))}
      </div>

      <div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0' }}
          >
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="20%" height={20} />
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="text" width="15%" height={20} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ViewStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = useIntlayer('statementViewPage');
  const [statement, setStatement] = useState<StatementDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = use(params);
  const statementId = resolvedParams.id;

  const fetchData = async () => {
    if (!statementId) {
      return;
    }

    try {
      setLoading(true);

      // Fetch statement and transactions
      const [stmtResponse, categoriesResponse] = await Promise.all([
        api.get<StatementViewResponse>(`/storage/files/${statementId}`),
        api.get<Category[]>('/categories'),
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
              ? `${formatStoredDate(rawStatement.statementDateFrom)} - ${formatStoredDate(rawStatement.statementDateTo)}`
              : undefined,
        },
        category: rawStatement.category,
        categoryId: rawStatement.categoryId,
      };

      // Transform transactions to match Transaction interface
      const transformedTransactions: Transaction[] = rawTransactions.map(tx => ({
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
        splitGroupId: tx.splitGroupId,
        splitIndex: tx.splitIndex,
      }));

      setStatement(transformedStatement);
      setTransactions(transformedTransactions);
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t.errors.loadFailed.value);
      toast.error(t.errors.loadFailed.value);
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
    if (!statementId) {
      return;
    }
    const toastId = toast.loading(t.loading.value);
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
        toast.success(t.fileLoaded.value, { id: toastId });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error(t.fileLoadFailed.value, { id: toastId });
    }
  };

  if (loading) {
    return <ViewStatementSkeleton />;
  }

  if (error || !statement) {
    return (
      <div
        className="container-shared"
        style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', padding: '32px 16px' }}
      >
        <div className="lumio-stmt-view__error-box">{error || t.statementNotFound.value}</div>
        <button
          type="button"
          onClick={() => router.back()}
          className="lumio-stmt-view__back-btn-primary"
        >
          <ArrowLeft size={16} />
          {t.back.value}
        </button>
      </div>
    );
  }

  return (
    <div
      className="container-shared"
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', padding: '32px 16px' }}
    >
      {/* Back Button */}
      <div style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.back()} className="lumio-stmt-view__back-btn">
          <ArrowLeft size={16} />
          {t.backToStatements.value}
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
