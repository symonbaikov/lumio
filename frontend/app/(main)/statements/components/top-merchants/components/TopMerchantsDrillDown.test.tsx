import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TopMerchantsDrillDown } from './TopMerchantsDrillDown';

vi.mock('@/app/(main)/statements/components/analytics/AnalyticsSourceBadge', () => ({
  AnalyticsSourceBadge: () => <span>source-badge</span>,
}));

describe('TopMerchantsDrillDown', () => {
  it('uses record currency for drill-down rows instead of workspace currency', () => {
    const html = renderToStaticMarkup(
      <TopMerchantsDrillDown
        selectedRow={{
          id: 'merchant-1',
          merchant: 'GitHub',
          sourceType: 'gmail',
          sourceChannel: 'gmail',
          flowType: 'spend',
          count: 1,
          total: 39,
          average: 39,
          lastDate: '2026-03-16',
          currency: 'USD',
        }}
        drillDownRecords={[
          {
            id: 'receipt-1',
            source: 'gmail',
            fileName: 'GitHub receipt',
            subject: 'GitHub',
            sender: 'noreply@github.com',
            status: 'processed',
            fileType: 'gmail',
            createdAt: '2026-03-16T00:00:00.000Z',
            statementDateFrom: '2026-03-16',
            statementDateTo: null,
            bankName: 'gmail',
            totalDebit: 39,
            totalCredit: null,
            currency: 'USD',
            exported: null,
            paid: null,
            parsingDetails: null,
            user: null,
            receivedAt: '2026-03-16T00:00:00.000Z',
            parsedData: { vendor: 'GitHub', date: '2026-03-16' },
            sourceType: 'gmail',
            sourceChannel: 'gmail',
            flowType: 'spend',
            merchant: 'GitHub',
            amount: 39,
            currencyValue: 'USD',
            dateValue: '2026-03-16',
            paymentPurpose: null,
            workspaceId: 'ws-1',
            workspaceName: 'Admin workspace',
          },
        ]}
        onClose={() => {}}
        currency="KZT"
        sourceLabels={{
          sourceBank: 'Bank',
          sourceCrypto: 'Crypto',
          sourceReceipt: 'Receipt',
          sourceGmailInbox: 'Gmail',
        }}
        labels={{
          drillDown: 'Drill-down',
          close: 'Close',
          noOperations: 'No operations',
          lastOperation: 'Last operation',
          source: 'Source',
          workspace: 'Workspace',
          amount: 'Amount',
        }}
      />,
    );

    expect(html).toContain('39,00');
    expect(html).toContain('$');
    expect(html).not.toContain('KZT');
  });
});
