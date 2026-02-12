import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatementsListItem } from './StatementsListItem';

type Statement = {
  id: string;
  source?: 'statement' | 'gmail';
  fileName: string;
  subject?: string;
  sender?: string;
  status: string;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
};

describe('StatementsListItem', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    container = null as unknown as HTMLDivElement;
  });

  it('renders Gmail receipt using document layout', () => {
    const root = createRoot(container);
    const onView = vi.fn();
    const onIconClick = vi.fn();

    const statement: Statement = {
      id: 'gmail-1',
      source: 'gmail',
      fileName: 'Receipt.pdf',
      subject: 'Receipt',
      sender: 'sender@example.com',
      status: 'parsed',
      totalDebit: null,
      totalCredit: null,
      createdAt: '2026-02-01T00:00:00Z',
      statementDateFrom: null,
      statementDateTo: null,
      bankName: 'gmail',
      fileType: 'pdf',
      currency: 'KZT',
      receivedAt: '2026-02-01T00:00:00Z',
      parsedData: {
        amount: 1200,
        currency: 'KZT',
        vendor: 'Shop',
        date: '2026-02-01',
      },
    };

    act(() => {
      root.render(
        <StatementsListItem
          statement={statement}
          viewLabel="View"
          isGmail
          isProcessing={false}
          merchantLabel="Shop"
          amountLabel="1,200KZT"
          dateLabel="02/01/2026"
          onView={onView}
          onIconClick={onIconClick}
          typeLabel="PDF"
          onToggleSelect={() => undefined}
        />,
      );
    });

    expect(container.textContent).toContain('Shop');
    expect(container.textContent).toContain('View');
    expect(container.querySelector('img[alt="Gmail"]')).not.toBeNull();
  });
});
