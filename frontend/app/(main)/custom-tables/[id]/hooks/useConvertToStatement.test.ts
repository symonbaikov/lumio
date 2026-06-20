import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/app/lib/api';
import toast from 'react-hot-toast';
import { useConvertToStatement } from './useConvertToStatement';

vi.mock('@/app/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useConvertToStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toast.loading).mockReturnValue('toast-1');
  });

  it('posts the conversion request and navigates to the generated statement', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statementId: 'statement-1',
        importedRows: 2,
        skippedRows: 1,
      },
    });
    const router = { push: vi.fn() };
    const { result } = renderHook(() =>
      useConvertToStatement({ tableId: 'table-1', router, t: {} }),
    );

    await act(async () => {
      await result.current.convertToStatement();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/custom-tables/table-1/convert-to-statement');
    expect(toast.success).toHaveBeenCalledWith('Imported 2 row(s), skipped 1', { id: 'toast-1' });
    expect(router.push).toHaveBeenCalledWith('/statements?statementId=statement-1');
  });
});
