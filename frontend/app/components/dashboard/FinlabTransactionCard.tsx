'use client';

import type { DashboardRange } from '@/app/hooks/useDashboard';
import { gmailReceiptsApi } from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandLogoAvatar } from '../BrandLogoAvatar';
import { PeriodDropdown } from './PeriodDropdown';

interface FinlabTransactionCardProps {
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabTransactionCard({
  formatAmount,
  range,
  onRangeChange,
}: FinlabTransactionCardProps) {
  interface GmailReceipt {
    id: string;
    sender: string;
    subject: string;
    receivedAt?: string | null;
    status: string;
    parsedData?: {
      amount?: number | null;
      vendor?: string | null;
      currency?: string | null;
    } | null;
  }

  const [receipts, setReceipts] = useState<GmailReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReceipts = async () => {
      setIsLoading(true);
      try {
        const response = await gmailReceiptsApi.listReceipts({ limit: 5, hasAmount: true });
        const nextReceipts = Array.isArray(response.data?.receipts)
          ? response.data.receipts
          : [];
        setReceipts(nextReceipts);
      } catch (error) {
        console.error('Failed to load Gmail receipts:', error);
        setReceipts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();
  }, [range]);

  return (
    <div className="bg-white rounded-[32px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] h-full flex flex-col border border-slate-100/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[17px]">
          Last Transaction
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </div>

      {isLoading ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
          Loading...
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
          No receipts found
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.slice(0, 5).map(receipt => {
            const vendorLabel = resolveGmailMerchantLabel({
              vendor: receipt.parsedData?.vendor,
              sender: receipt.sender,
              subject: receipt.subject,
              fallback: 'Gmail receipt',
            });
            const amount = receipt.parsedData?.amount ?? null;
            const isApproved = receipt.status === 'approved';
            const receivedAt = receipt.receivedAt ? new Date(receipt.receivedAt) : null;
            const hasValidReceivedAt = receivedAt instanceof Date && !Number.isNaN(receivedAt.valueOf());

            return (
              <div key={receipt.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <BrandLogoAvatar sender={receipt.sender} vendorName={vendorLabel} size={48} />
                  <div>
                    <p className="text-[15px] font-bold text-slate-800 tracking-tight leading-tight">
                      {vendorLabel}
                    </p>
                    <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                      Gmail receipt
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right hidden sm:block">
                    <p className="text-[14px] font-bold text-slate-800">
                      {hasValidReceivedAt
                        ? receivedAt?.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                    <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                      {hasValidReceivedAt
                        ? receivedAt?.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>

                  <div className="w-24 text-right">
                    <span className="text-[16px] font-bold text-slate-800 block">
                      {amount == null ? '—' : formatAmount(amount)}
                    </span>
                  </div>

                  <div className="w-[84px] text-right">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-[13px] font-bold bg-emerald-50 text-emerald-600">
                      {isApproved ? 'Approved' : 'Success'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
