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

  it('renders dedicated mobile and desktop layout containers', () => {
    const root = createRoot(container);

    const statement: Statement = {
      id: 'statement-1',
      source: 'statement',
      fileName: 'Report.pdf',
      status: 'parsed',
      totalDebit: 1200,
      totalCredit: 0,
      createdAt: '2026-02-01T00:00:00Z',
      statementDateFrom: '2026-01-01',
      statementDateTo: '2026-01-31',
      bankName: 'kaspi',
      fileType: 'pdf',
      currency: 'KZT',
    };

    act(() => {
      root.render(
        <StatementsListItem
          statement={statement}
          viewLabel="View"
          isGmail={false}
          isProcessing={false}
          merchantLabel="Kaspi"
          amountLabel="1,200 KZT"
          dateLabel="01/31/2026"
          onView={() => undefined}
          onIconClick={() => undefined}
          onToggleSelect={() => undefined}
          typeLabel="PDF"
        />,
      );
    });

    expect(
      container.querySelector('[data-testid="statement-item-mobile-statement-1"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="statement-item-desktop-statement-1"]'),
    ).toBeTruthy();
  });

  it('renders compact mobile card without type label and view button', () => {
    const root = createRoot(container);
    const onView = vi.fn();

    const statement: Statement = {
      id: 'statement-compact',
      source: 'statement',
      fileName: 'Receipt.pdf',
      status: 'parsed',
      totalDebit: 1200,
      totalCredit: 0,
      createdAt: '2026-02-01T00:00:00Z',
      statementDateFrom: '2026-01-01',
      statementDateTo: '2026-01-31',
      bankName: 'kaspi',
      fileType: 'pdf',
      currency: 'KZT',
    };

    act(() => {
      root.render(
        <StatementsListItem
          statement={statement}
          viewLabel="View"
          isGmail={false}
          isProcessing={false}
          merchantLabel="Kaspi"
          amountLabel="1,200 KZT"
          dateLabel="01/31/2026"
          onView={onView}
          onIconClick={() => undefined}
          onToggleSelect={() => undefined}
          typeLabel="PDF"
        />,
      );
    });

    const mobileContainer = container.querySelector(
      '[data-testid="statement-item-mobile-statement-compact"]',
    ) as HTMLDivElement | null;
    expect(mobileContainer).toBeTruthy();
    expect(mobileContainer?.textContent).toContain('Kaspi');
    expect(mobileContainer?.textContent).toContain('1,200 KZT');
    expect(mobileContainer?.textContent).toContain('01/31/2026');
    expect(mobileContainer?.textContent).not.toContain('View');
    expect(mobileContainer?.textContent).not.toContain('PDF');

    const mobileCardButton = container.querySelector(
      '[data-testid="statement-item-mobile-card-statement-compact"]',
    ) as HTMLButtonElement | null;
    expect(mobileCardButton).toBeTruthy();

    act(() => {
      mobileCardButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onView).toHaveBeenCalledTimes(1);
  });
});
