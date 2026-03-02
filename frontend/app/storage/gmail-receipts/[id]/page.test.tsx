// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GmailReceiptDocumentPage from './page';

const apiMocks = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockGetReceipt: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiMocks.mockApiGet,
  },
  gmailReceiptsApi: {
    getReceipt: apiMocks.mockGetReceipt,
    updateReceiptParsedData: vi.fn(),
    approveReceipt: vi.fn(),
    exportReceiptsToSheets: vi.fn(),
    markDuplicate: vi.fn(),
    unmarkDuplicate: vi.fn(),
  },
}));

vi.mock('@/lib/api/audit', () => ({
  fetchEntityHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/app/audit/components/EntityHistoryTimeline', () => ({
  EntityHistoryTimeline: () => null,
}));

vi.mock('@/app/audit/components/AuditEventDrawer', () => ({
  AuditEventDrawer: () => null,
}));

vi.mock('../components/ReceiptPreviewModal', () => ({
  ReceiptPreviewModal: () => null,
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'receipt-1' }),
  useRouter: () => ({ push: routerMocks.push }),
}));

describe('GmailReceiptDocumentPage', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    routerMocks.push.mockReset();
  });

  it('navigates back to statements', async () => {
    apiMocks.mockGetReceipt.mockResolvedValue({
      data: {
        receipt: {
          id: 'receipt-1',
          subject: 'GitHub Receipt',
          sender: 'GitHub <noreply@github.com>',
          receivedAt: '2026-02-27T00:00:00Z',
          status: 'needs_review',
          isDuplicate: false,
          parsedData: {
            amount: 17.61,
            currency: 'USD',
            date: '2026-02-27',
            vendor: 'GitHub',
            confidence: 0.85,
            lineItems: [],
          },
          metadata: {},
        },
        potentialDuplicates: [],
      },
    });

    apiMocks.mockApiGet.mockResolvedValue({
      data: [{ id: 'cat-1', name: 'Software', isEnabled: true }],
    });

    const root = createRoot(container);

    await act(async () => {
      root.render(<GmailReceiptDocumentPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const backButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Back',
    );

    expect(backButton).toBeTruthy();

    await act(async () => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(routerMocks.push).toHaveBeenCalledWith('/statements');
  });

  it('opens the category drawer from the Category button', async () => {
    apiMocks.mockGetReceipt.mockResolvedValue({
      data: {
        receipt: {
          id: 'receipt-1',
          subject: 'GitHub Receipt',
          sender: 'GitHub <noreply@github.com>',
          receivedAt: '2026-02-27T00:00:00Z',
          status: 'needs_review',
          isDuplicate: false,
          parsedData: {
            amount: 17.61,
            currency: 'USD',
            date: '2026-02-27',
            vendor: 'GitHub',
            confidence: 0.85,
            lineItems: [],
          },
          metadata: {},
        },
        potentialDuplicates: [],
      },
    });

    apiMocks.mockApiGet.mockResolvedValue({
      data: [{ id: 'cat-1', name: 'Software', isEnabled: true }],
    });

    const root = createRoot(container);

    await act(async () => {
      root.render(<GmailReceiptDocumentPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('input[placeholder="Search categories"]')).toBeNull();

    const categoryButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Category'),
    );

    expect(categoryButton).toBeTruthy();

    await act(async () => {
      categoryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.querySelector('input[placeholder="Search categories"]')).toBeTruthy();
  });

  it('renders watch in Gmail link when message id exists', async () => {
    apiMocks.mockGetReceipt.mockResolvedValue({
      data: {
        receipt: {
          id: 'receipt-1',
          subject: 'GitHub Receipt',
          sender: 'GitHub <noreply@github.com>',
          receivedAt: '2026-02-27T00:00:00Z',
          status: 'needs_review',
          isDuplicate: false,
          gmailMessageId: 'gmail-123',
          parsedData: {
            amount: 17.61,
            currency: 'USD',
            date: '2026-02-27',
            vendor: 'GitHub',
            confidence: 0.85,
            lineItems: [],
          },
          metadata: {},
        },
        potentialDuplicates: [],
      },
    });

    apiMocks.mockApiGet.mockResolvedValue({
      data: [{ id: 'cat-1', name: 'Software', isEnabled: true }],
    });

    const root = createRoot(container);

    await act(async () => {
      root.render(<GmailReceiptDocumentPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const gmailLink = Array.from(container.querySelectorAll('a')).find(anchor =>
      anchor.textContent?.includes('Watch in Gmail'),
    );

    expect(gmailLink).toBeTruthy();
    expect(gmailLink?.getAttribute('href')).toBe(
      'https://mail.google.com/mail/u/0/#inbox/gmail-123',
    );
  });
});
