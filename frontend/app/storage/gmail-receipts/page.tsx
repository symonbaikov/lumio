'use client';

import { StatementsListItem } from '@/app/(main)/statements/components/StatementsListItem';
import {
  type GmailReceipt as GmailReceiptValidation,
  hasGmailReceiptAmount,
} from '@/app/(main)/statements/components/gmail-receipt-mapping';
import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { Checkbox } from '@/app/components/ui/checkbox';
import { AppPagination } from '@/app/components/ui/pagination';
import { gmailReceiptsApi } from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { Filter, RefreshCw, Search } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BulkActionsBar } from './components/BulkActionsBar';
import { ReceiptDetailDrawer } from './components/ReceiptDetailDrawer';

interface Receipt extends GmailReceiptValidation {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  parsedData?: {
    amount?: number | string | null;
    currency?: string;
    vendor?: string;
    date?: string;
    tax?: number;
    category?: string;
    confidence?: number;
  };
  isDuplicate: boolean;
  metadata?: {
    potentialDuplicates?: string[];
  };
}

const parseAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

export default function GmailReceiptsPage() {
  const content = useIntlayer('gmail-receipts-page');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [previewReceiptFileName, setPreviewReceiptFileName] = useState<string>('receipt.pdf');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approvedThisMonth: 0,
    totalAmount: 0,
  });

  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 30,
    total: 0,
  });

  const receiptsById = useMemo(() => {
    const map = new Map<string, Receipt>();
    receipts.forEach(receipt => map.set(receipt.id, receipt));
    return map;
  }, [receipts]);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const receiptId = searchParams.get('receiptId');
    if (receiptId) {
      setSelectedReceiptId(receiptId);
    }
  }, [searchParams]);

  useEffect(() => {
    loadReceipts();
  }, [pagination.offset, pagination.limit, selectedStatus]);

  useEffect(() => {
    filterReceipts();
  }, [receipts, selectedStatus, searchQuery]);

  const loadStatus = async () => {
    try {
      const response = await gmailReceiptsApi.getStatus();
      setConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to load Gmail status', error);
    }
  };

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const includeInvalid = selectedStatus === 'needs_review' || selectedStatus === 'failed';
      const statusFilter = selectedStatus !== 'all' ? selectedStatus : undefined;
      const response = await gmailReceiptsApi.listReceipts({
        limit: pagination.limit,
        offset: pagination.offset,
        status: statusFilter,
        includeInvalid,
      });

      const fetchedReceipts = Array.isArray(response.data.receipts) ? response.data.receipts : [];
      const visibleReceipts = includeInvalid
        ? fetchedReceipts
        : fetchedReceipts.filter((receipt: Receipt) => hasGmailReceiptAmount(receipt));

      setReceipts(visibleReceipts);
      setPagination(prev => ({ ...prev, total: response.data.total }));

      // Calculate stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const pending = visibleReceipts.filter((r: Receipt) =>
        ['new', 'parsed', 'needs_review', 'draft'].includes(r.status),
      ).length;

      const approvedThisMonth = visibleReceipts.filter((r: Receipt) => {
        if (r.status !== 'approved') return false;
        const date = new Date(r.receivedAt);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      }).length;

      const totalAmount = visibleReceipts.reduce(
        (sum: number, r: Receipt) => sum + (parseAmountValue(r.parsedData?.amount) || 0),
        0,
      );

      setStats({
        total: visibleReceipts.length,
        pending,
        approvedThisMonth,
        totalAmount,
      });
    } catch (error) {
      console.error('Failed to load receipts', error);
      toast.error(content.toast.error.value);
    } finally {
      setLoading(false);
    }
  };

  const filterReceipts = () => {
    let filtered = receipts;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.parsedData?.vendor?.toLowerCase().includes(query) ||
          r.parsedData?.amount?.toString().includes(query) ||
          r.sender.toLowerCase().includes(query),
      );
    }

    setFilteredReceipts(filtered);
  };

  const handleSelectReceipt = (id: string) => {
    const newSelected = new Set(selectedReceipts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReceipts(newSelected);
  };

  const openReceiptDrawer = (id: string) => {
    setSelectedReceiptId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('receiptId', id);
    const query = params.toString();
    router.replace(`/storage/gmail-receipts${query ? `?${query}` : ''}`, { scroll: false });
  };

  const closeReceiptDrawer = () => {
    setSelectedReceiptId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('receiptId');
    const query = params.toString();
    router.replace(`/storage/gmail-receipts${query ? `?${query}` : ''}`, { scroll: false });
  };

  const handleSelectAll = () => {
    if (selectedReceipts.size === filteredReceipts.length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(filteredReceipts.map(r => r.id)));
    }
  };

  const handleBulkApprove = async (categoryId?: string) => {
    try {
      const receiptIds = Array.from(selectedReceipts);
      await gmailReceiptsApi.bulkApproveReceipts(receiptIds, categoryId);
      toast.success(content.toast.bulkApproveSuccess.value);
      setSelectedReceipts(new Set());
      loadReceipts();
    } catch (error) {
      console.error('Failed to bulk approve', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleExportToSheets = async () => {
    try {
      const receiptIds = Array.from(selectedReceipts);
      const response = await gmailReceiptsApi.exportReceiptsToSheets(receiptIds);
      toast.success(content.toast.exportSuccess.value);
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Failed to export', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleApprove = async (receipt: Receipt) => {
    try {
      await gmailReceiptsApi.approveReceipt(receipt.id, {
        description: receipt.parsedData?.vendor || receipt.subject,
        amount: receipt.parsedData?.amount || 0,
        currency: receipt.parsedData?.currency || 'KZT',
        date: receipt.parsedData?.date || receipt.receivedAt,
      });
      toast.success(content.toast.receiptApproved.value);
      loadReceipts();
    } catch (error) {
      console.error('Failed to approve receipt', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleReject = async (receipt: Receipt) => {
    try {
      await gmailReceiptsApi.updateReceipt(receipt.id, { status: 'rejected' });
      toast.success(content.toast.receiptUpdated.value);
      loadReceipts();
    } catch (error) {
      console.error('Failed to reject receipt', error);
      toast.error(content.toast.error.value);
    }
  };

  const handleApproveById = async (id: string) => {
    const receipt = receiptsById.get(id);
    if (!receipt) return;
    await handleApprove(receipt);
  };

  const handleRejectById = async (id: string) => {
    const receipt = receiptsById.get(id);
    if (!receipt) return;
    await handleReject(receipt);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      parsed: 'bg-green-100 text-green-800',
      needs_review: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isReceiptProcessing = (status: string) => {
    const normalized = (status || '').toLowerCase();
    return normalized === 'new' || normalized === 'processing';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: content.filters.new.value,
      parsed: content.filters.parsed.value,
      needs_review: content.filters.needsReview.value,
      draft: content.filters.draft.value,
      approved: content.filters.approved.value,
      rejected: content.filters.rejected.value,
      failed: content.filters.failed.value,
    };
    return labels[status] || status;
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));

  return (
    <div className="flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{content.title.value}</h1>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {connected
              ? content.connectionStatus.connected.value
              : content.connectionStatus.disconnected.value}
          </div>
        </div>
        <p className="text-gray-600">{content.subtitle.value}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">{content.stats.total.value}</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">{content.stats.pending.value}</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">{content.stats.approved.value}</div>
          <div className="text-2xl font-bold">{stats.approvedThisMonth}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">{content.stats.totalAmount.value}</div>
          <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} KZT</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{content.filters.all.value}</option>
              <option value="new">{content.filters.new.value}</option>
              <option value="parsed">{content.filters.parsed.value}</option>
              <option value="needs_review">{content.filters.needsReview.value}</option>
              <option value="draft">{content.filters.draft.value}</option>
              <option value="approved">{content.filters.approved.value}</option>
              <option value="rejected">{content.filters.rejected.value}</option>
              <option value="failed">{content.filters.failed.value}</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={content.filters.searchPlaceholder.value}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadReceipts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {content.actions.refresh.value}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedReceipts.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedReceipts.size}
          onClear={() => setSelectedReceipts(new Set())}
          onBulkApprove={handleBulkApprove}
          onExportToSheets={handleExportToSheets}
        />
      )}

      {/* Receipts List */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-white shadow">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {content.table.emptyState.value}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <div className="hidden md:flex items-center gap-3 px-1 py-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              <div className="w-4">
                <Checkbox
                  checked={
                    selectedReceipts.size === filteredReceipts.length && filteredReceipts.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="w-11">Receipt</div>
              <div className="w-3" />
              <div className="w-20">Type</div>
              <div className="w-24">{content.table.date.value}</div>
              <div className="flex-1">{content.table.merchant.value}</div>
              <div className="w-36 text-right">{content.table.amount.value}</div>
              <div className="w-36 text-right">{content.table.actions.value}</div>
            </div>
            {filteredReceipts.map(receipt => {
              const merchantLabel = resolveGmailMerchantLabel({
                vendor: receipt.parsedData?.vendor,
                sender: receipt.sender,
                subject: receipt.subject,
                fallback: 'Gmail',
              });
              const normalizedAmount = parseAmountValue(receipt.parsedData?.amount);
              const statement = {
                id: receipt.id,
                source: 'gmail' as const,
                fileName: merchantLabel,
                subject: receipt.subject,
                sender: receipt.sender,
                status: receipt.status,
                totalDebit: normalizedAmount,
                totalCredit: null,
                createdAt: receipt.receivedAt,
                statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
                statementDateTo: null,
                bankName: 'gmail',
                fileType: 'pdf',
                currency: receipt.parsedData?.currency || 'KZT',
                receivedAt: receipt.receivedAt,
                parsedData: {
                  amount: normalizedAmount ?? undefined,
                  currency: receipt.parsedData?.currency,
                  vendor: receipt.parsedData?.vendor,
                  date: receipt.parsedData?.date,
                },
              };
              const dateValue = receipt.parsedData?.date || receipt.receivedAt;
              const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : '—';
              const hasAmount = hasGmailReceiptAmount(receipt);
              const amountLabel = hasAmount
                ? `${(normalizedAmount || 0).toLocaleString()}${receipt.parsedData?.currency || 'KZT'}`
                : '-';

              return (
                <div key={receipt.id} className="relative">
                  <StatementsListItem
                    statement={statement}
                    viewLabel={content.actions.viewDetails.value}
                    isGmail
                    isProcessing={isReceiptProcessing(receipt.status)}
                    merchantLabel={merchantLabel}
                    amountLabel={amountLabel}
                    dateLabel={dateLabel}
                    typeLabel="PDF"
                    onView={() => openReceiptDrawer(receipt.id)}
                    onIconClick={() => {
                      setPreviewReceiptId(receipt.id);
                      setPreviewReceiptFileName(`${merchantLabel}.pdf`);
                    }}
                    onToggleSelect={() => handleSelectReceipt(receipt.id)}
                    selected={selectedReceipts.has(receipt.id)}
                  />
                  <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeColor(receipt.status)}`}
                      >
                        {getStatusLabel(receipt.status)}
                      </span>
                      {!hasAmount && receipt.status === 'needs_review' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          Missing amount
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-sm text-gray-600 min-w-[120px] text-center">
          Page {currentPage} of {totalPages}
        </span>
        <AppPagination
          page={currentPage}
          total={totalPages}
          onChange={nextPage =>
            setPagination(prev => ({
              ...prev,
              offset: (nextPage - 1) * prev.limit,
            }))
          }
        />
      </div>

      {/* Receipt Detail Drawer */}
      {selectedReceiptId && (
        <ReceiptDetailDrawer
          receiptId={selectedReceiptId}
          onClose={closeReceiptDrawer}
          onUpdate={loadReceipts}
        />
      )}

      {previewReceiptId && (
        <PDFPreviewModal
          isOpen={Boolean(previewReceiptId)}
          onClose={() => setPreviewReceiptId(null)}
          fileId={previewReceiptId}
          fileName={previewReceiptFileName}
          source="gmail"
        />
      )}
    </div>
  );
}
