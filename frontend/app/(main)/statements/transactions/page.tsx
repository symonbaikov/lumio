'use client';

import { TransactionTab } from '@/app/components/dashboard/TransactionTab';
import StatementsSidePanel from '../components/StatementsSidePanel';

export default function StatementTransactionsPage() {
  return (
    <>
      <StatementsSidePanel activeItem="transactions" />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, categorise and manage all transactions
          </p>
        </div>
        <TransactionTab />
      </div>
    </>
  );
}
