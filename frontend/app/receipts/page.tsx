'use client';

import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { CheckCircle, Clock, FileText, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Receipt = {
  id: string;
  gmailMessageId: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: 'draft' | 'reviewed' | 'approved' | 'rejected';
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    category?: string;
    confidence?: number;
  };
  metadata?: {
    snippet?: string;
    attachments?: Array<{
      filename: string;
      mimeType: string;
      size: number;
    }>;
  };
};

type ReceiptsResponse = {
  receipts: Receipt[];
  total: number;
  limit: number;
  offset: number;
};

const formatDateTime = (value: string, locale?: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale || 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatCurrency = (amount?: number, currency = 'KZT') => {
  if (amount === undefined) return '—';
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency,
  }).format(amount);
};

const StatusBadge = ({ status }: { status: Receipt['status'] }) => {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: FileText },
    reviewed: { label: 'Reviewed', className: 'bg-blue-100 text-blue-700', icon: Clock },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

export default function ReceiptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const response = await apiClient.get<ReceiptsResponse>(
        `/integrations/gmail/receipts?${params.toString()}`,
      );
      setReceipts(response.data.receipts);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user, statusFilter]);

  const handleStatusChange = async (receiptId: string, newStatus: Receipt['status']) => {
    try {
      await apiClient.patch(`/integrations/gmail/receipts/${receiptId}`, { status: newStatus });
      toast.success('Receipt updated');
      await loadReceipts();
    } catch (error) {
      toast.error('Failed to update receipt');
    }
  };

  const handleApproveReceipt = async (receipt: Receipt) => {
    try {
      // Validate required fields from parsedData
      if (!receipt.parsedData?.amount || !receipt.parsedData?.date) {
        toast.error('Receipt must have amount and date to be approved');
        return;
      }

      const approvalData = {
        amount: receipt.parsedData.amount,
        currency: receipt.parsedData.currency || 'KZT',
        date: receipt.parsedData.date,
        description: receipt.parsedData.vendor || receipt.subject || 'Receipt transaction',
        categoryId: undefined, // Can be enhanced later to allow category selection
      };

      await apiClient.post(`/integrations/gmail/receipts/${receipt.id}/approve`, approvalData);
      toast.success('Receipt approved and transaction created');
      await loadReceipts();
    } catch (error) {
      toast.error('Failed to approve receipt');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <LoadingAnimation size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-gray-800 font-semibold mb-2">Please sign in</p>
          <p className="text-sm text-gray-600">Sign in to view your receipts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Review and manage receipts from your Gmail</p>
        </div>
        <div className="text-sm text-gray-500">
          {total} receipt{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === ''
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'draft'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Draft
        </button>
        <button
          onClick={() => setStatusFilter('reviewed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'reviewed'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Reviewed
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Approved
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Receipts Table */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No receipts found. Connect Gmail to start importing receipts.
                  </td>
                </tr>
              ) : (
                receipts.map(receipt => (
                  <tr
                    key={receipt.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(receipt.receivedAt, user.locale)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.sender}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{receipt.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(receipt.parsedData?.amount, receipt.parsedData?.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={receipt.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {receipt.status === 'draft' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStatusChange(receipt.id, 'reviewed');
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Review
                        </button>
                      )}
                      {receipt.status === 'reviewed' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleApproveReceipt(receipt);
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer (simplified for now) */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Receipt Details</h2>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium">{selectedReceipt.subject}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sender</p>
                <p className="font-medium">{selectedReceipt.sender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {formatDateTime(selectedReceipt.receivedAt, user.locale)}
                </p>
              </div>
              {selectedReceipt.parsedData && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">
                      {formatCurrency(
                        selectedReceipt.parsedData.amount,
                        selectedReceipt.parsedData.currency,
                      )}
                    </p>
                  </div>
                  {selectedReceipt.parsedData.vendor && (
                    <div>
                      <p className="text-sm text-gray-500">Vendor</p>
                      <p className="font-medium">{selectedReceipt.parsedData.vendor}</p>
                    </div>
                  )}
                </>
              )}
              {selectedReceipt.metadata?.snippet && (
                <div>
                  <p className="text-sm text-gray-500">Preview</p>
                  <p className="text-sm text-gray-700">{selectedReceipt.metadata.snippet}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
