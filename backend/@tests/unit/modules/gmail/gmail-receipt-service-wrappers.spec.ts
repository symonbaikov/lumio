import { Category, Receipt } from '@/entities';
import { GmailReceiptCategoryService } from '@/modules/gmail/services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from '@/modules/gmail/services/gmail-receipt-duplicate.service';

type ReceiptCategoryServiceLike = {
  suggestCategory: (
    receipt: Receipt,
    queryMode?: 'direct' | 'via-statement',
  ) => Promise<Category | null>;
};

type ReceiptDuplicateServiceLike = {
  findPotentialDuplicates: (receipt: Receipt) => Promise<Receipt[]>;
  markAsDuplicate: (receiptId: string, originalId: string, userId: string) => Promise<void>;
  unmarkDuplicate: (receiptId: string, userId: string) => Promise<void>;
};

describe('Gmail receipt service wrappers', () => {
  it('delegates category suggestion to ReceiptCategoryService using via-statement mode', async () => {
    const receipt = { id: 'receipt-1' } as Receipt;
    const category = { id: 'category-1', name: 'Food' } as Category;
    const receiptCategoryService = {
      suggestCategory: jest.fn().mockResolvedValue(category),
    };

    const service = new GmailReceiptCategoryService(
      receiptCategoryService as unknown as ReceiptCategoryServiceLike,
    );

    await expect(service.suggestCategory(receipt)).resolves.toBe(category);
    expect(receiptCategoryService.suggestCategory).toHaveBeenCalledWith(receipt, 'via-statement');
  });

  it('delegates duplicate lookup to ReceiptDuplicateService', async () => {
    const receipt = { id: 'receipt-1' } as Receipt;
    const duplicates = [{ id: 'receipt-2' }] as Receipt[];
    const receiptDuplicateService = {
      findPotentialDuplicates: jest.fn().mockResolvedValue(duplicates),
      markAsDuplicate: jest.fn().mockResolvedValue(undefined),
      unmarkDuplicate: jest.fn().mockResolvedValue(undefined),
    };

    const service = new GmailReceiptDuplicateService(
      receiptDuplicateService as unknown as ReceiptDuplicateServiceLike,
    );

    await expect(service.findPotentialDuplicates(receipt)).resolves.toEqual(duplicates);
    await service.markAsDuplicate('receipt-1', 'receipt-2', 'user-1');
    await service.unmarkDuplicate('receipt-1', 'user-1');

    expect(receiptDuplicateService.findPotentialDuplicates).toHaveBeenCalledWith(receipt);
    expect(receiptDuplicateService.markAsDuplicate).toHaveBeenCalledWith(
      'receipt-1',
      'receipt-2',
      'user-1',
    );
    expect(receiptDuplicateService.unmarkDuplicate).toHaveBeenCalledWith('receipt-1', 'user-1');
  });
});
