// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionFilesTab } from './TransactionFilesTab';

const api = vi.hoisted(() => ({
  listWorkspaceTags: vi.fn(),
  getTags: vi.fn(),
  setTags: vi.fn(),
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}));

vi.mock('@/app/lib/transaction-files-api', () => ({ transactionFilesApi: api }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const labels = {
  tabTitle: 'Files & tags',
  tagsTitle: 'Tags',
  tagsEmpty: 'No tags yet',
  attachmentsTitle: 'Attachments',
  attachmentsEmpty: 'Nothing attached',
  upload: 'Attach file',
  loadFailed: 'load failed',
  saveFailed: 'save failed',
  uploadFailed: 'upload failed',
  deleteFailed: 'delete failed',
};

describe('TransactionFilesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listWorkspaceTags.mockResolvedValue([
      { id: 'tag-a', name: 'Travel', color: null },
      { id: 'tag-b', name: 'Office', color: null },
    ]);
    api.getTags.mockResolvedValue([{ id: 'tag-a', name: 'Travel', color: null }]);
    api.listAttachments.mockResolvedValue([]);
    api.setTags.mockResolvedValue([]);
  });

  it('sends the full desired tag set when a tag is toggled on', async () => {
    render(<TransactionFilesTab transactionId="tx-1" labels={labels} />);
    await screen.findByText('Office');

    await userEvent.click(screen.getByText('Office'));

    // The API replaces rather than merges, so the already-applied tag must be resent.
    await waitFor(() => {
      expect(api.setTags).toHaveBeenCalledWith('tx-1', ['tag-a', 'tag-b']);
    });
  });

  it('sends the remaining tags when one is toggled off', async () => {
    render(<TransactionFilesTab transactionId="tx-1" labels={labels} />);
    await screen.findByText('Travel');

    await userEvent.click(screen.getByText('Travel'));

    await waitFor(() => {
      expect(api.setTags).toHaveBeenCalledWith('tx-1', []);
    });
  });

  it('restores the previous selection when saving fails', async () => {
    api.setTags.mockRejectedValue(new Error('boom'));
    render(<TransactionFilesTab transactionId="tx-1" labels={labels} />);
    await screen.findByText('Office');

    await userEvent.click(screen.getByText('Office'));

    await waitFor(() => {
      expect(api.setTags).toHaveBeenCalled();
    });
    // Optimistic update rolled back: 'Travel' stays selected, 'Office' does not stick.
    await waitFor(() => {
      expect(screen.getByText('Office').closest('.MuiChip-outlined')).not.toBeNull();
    });
  });

  it('lists existing attachments with their size', async () => {
    api.listAttachments.mockResolvedValue([
      {
        id: 'att-1',
        transactionId: 'tx-1',
        fileName: 'receipt.png',
        mimeType: 'image/png',
        fileSize: '2048',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);

    render(<TransactionFilesTab transactionId="tx-1" labels={labels} />);

    expect(await screen.findByText('receipt.png')).toBeTruthy();
    expect(screen.getByText('2 KB')).toBeTruthy();
  });
});
