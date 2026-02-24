import { DocumentClassifierService } from '@/modules/parsing/services/document-classifier.service';

describe('DocumentClassifierService', () => {
  let service: DocumentClassifierService;

  beforeEach(() => {
    service = new DocumentClassifierService();
  });

  describe('classify', () => {
    it('classifies a receipt by receipt keyword', () => {
      const result = service.classify('Payment Receipt\nStore ABC\nTotal: $45.99');

      expect(result.documentType).toBe('receipt');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('classifies a receipt by Russian keyword', () => {
      const result = service.classify('Кассовый чек\nМагазин\nИтого: 5000 KZT');

      expect(result.documentType).toBe('receipt');
    });

    it('classifies an invoice', () => {
      const result = service.classify(
        'Invoice #INV-2026-001\nBill To: Company XYZ\nAmount Due: $1,200.00',
      );

      expect(result.documentType).toBe('invoice');
    });

    it('classifies a bank statement', () => {
      const result = service.classify(
        'Выписка по счёту KZ123456\nПериод: 01.01.2026 - 31.01.2026\nДебет Кредит Остаток',
      );

      expect(result.documentType).toBe('bank_statement');
    });

    it('classifies a bank statement by English keywords', () => {
      const result = service.classify(
        'Account Statement\nAccount Number: 1234567890\nOpening Balance: $5,000.00\nDate Description Debit Credit Balance',
      );

      expect(result.documentType).toBe('bank_statement');
    });

    it('returns unknown for ambiguous text', () => {
      const result = service.classify('Hello world, this is a random document');

      expect(result.documentType).toBe('unknown');
    });

    it('classifies receipt from filename hint', () => {
      const result = service.classify('Some text with total $50', {
        fileNameHint: 'receipt_2026.pdf',
      });

      expect(result.documentType).toBe('receipt');
    });
  });
});
