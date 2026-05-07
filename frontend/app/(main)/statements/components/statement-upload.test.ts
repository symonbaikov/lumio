// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractUploadErrorMessage,
  uploadReceiptScanFiles,
  uploadScanDrawerFiles,
} from './statement-upload';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    post: apiMocks.post,
  },
}));

const labels = {
  pickAtLeastOne: 'Select at least one file',
  uploadedProcessing: 'Files uploaded',
  uploadFailed: 'Failed to upload files',
};

describe('statement-upload helpers', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  it('extracts the first backend validation message from error payload arrays', () => {
    const error = {
      response: {
        data: {
          message: ['Receipt amount could not be determined', 'ignored'],
        },
      },
    };

    expect(extractUploadErrorMessage(error, labels.uploadFailed)).toBe(
      'Receipt amount could not be determined',
    );
  });

  it('preserves backend receipt upload errors instead of replacing them with a generic message', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);

    apiMocks.post.mockRejectedValue({
      response: {
        data: {
          message: 'Receipt scan could not be processed',
        },
      },
    });

    await expect(
      uploadReceiptScanFiles({
        files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })],
        labels,
        onUploadSuccess,
        refreshAfterCreate,
      }),
    ).rejects.toThrow('Receipt scan could not be processed');

    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(refreshAfterCreate).not.toHaveBeenCalled();
  });

  it('routes all scan drawer files through the receipt endpoint', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);
    apiMocks.post.mockResolvedValue({ data: {} });

    await uploadScanDrawerFiles({
      payload: {
        files: [
          new File(['statement'], 'statement.pdf', { type: 'application/pdf' }),
          new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }),
        ],
        allowDuplicates: true,
        requireManualCategorySelection: false,
      },
      labels,
      onUploadSuccess,
      refreshAfterCreate,
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/statements/upload-receipt',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  });
});
