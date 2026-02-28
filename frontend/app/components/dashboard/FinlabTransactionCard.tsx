'use client';

import type { DashboardRecentActivity } from '@/app/hooks/useDashboard';
import { CreditCard, FileText, Info, Upload } from 'lucide-react';

interface FinlabTransactionCardProps {
  activities: DashboardRecentActivity[];
  formatAmount: (value: number) => string;
}

export function FinlabTransactionCard({ activities, formatAmount }: FinlabTransactionCardProps) {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] h-full border border-slate-100/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[17px]">
          Last Transaction
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <button className="text-[13px] text-slate-400 font-medium flex items-center gap-1 hover:text-slate-600 transition-colors">
          Monthly <span className="text-[10px]">▼</span>
        </button>
      </div>

      {!activities.length ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
          No recent transactions
        </div>
      ) : (
        <div className="space-y-6">
          {activities.slice(0, 4).map(activity => {
            const isPayment = activity.type === 'payment' || activity.type === 'transaction';
            const amount = activity.amount;

            return (
              <div
                key={activity.id}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100 group-hover:shadow-sm transition-all">
                    {isPayment ? (
                      <CreditCard className="w-5 h-5 text-indigo-500" />
                    ) : activity.type === 'statement_upload' || activity.type === 'import' ? (
                      <Upload className="w-5 h-5 text-sky-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800 tracking-tight leading-tight">
                      {activity.title}
                    </p>
                    <p className="text-[13px] text-slate-400 font-medium mt-0.5 capitalize">
                      {activity.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right hidden sm:block">
                    <p className="text-[14px] font-bold text-slate-800">
                      {new Date(activity.timestamp).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                      {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="w-24 text-right">
                    {amount !== null && amount !== undefined ? (
                      <span className="text-[16px] font-bold text-slate-800 block">
                        {isPayment && amount > 0 ? '-' : ''}
                        {formatAmount(amount)}
                      </span>
                    ) : (
                      <span className="text-[16px] font-bold text-slate-800 block">-</span>
                    )}
                  </div>

                  <div className="w-[84px] text-right">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-[13px] font-bold bg-emerald-50 text-emerald-600">
                      Success
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
