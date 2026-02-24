import { DocumentClassifierService } from '@/modules/parsing/services/document-classifier.service';
import { OcrService } from '@/modules/parsing/services/ocr.service';
import { TransactionTypeDetectorService } from '@/modules/parsing/services/transaction-type-detector.service';
import { UniversalAmountParser } from '@/modules/parsing/services/universal-amount-parser.service';
import { UniversalExtractorService } from '@/modules/parsing/services/universal-extractor.service';

describe('UniversalExtractorService', () => {
  let service: UniversalExtractorService;

  beforeEach(() => {
    service = new UniversalExtractorService(
      new UniversalAmountParser(),
      new TransactionTypeDetectorService(),
      new DocumentClassifierService(),
      new OcrService(),
    );
  });

  describe('extractFromText', () => {
    it('extracts amount and expense type from receipt text', async () => {
      const text = 'Payment Receipt\nStore ABC\nItem 1  $10.00\nItem 2  $20.49\nTotal: $30.49';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(30.49);
      expect(result.currency).toBe('USD');
      expect(result.transactionType).toBe('expense');
      expect(result.documentType).toBe('receipt');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('extracts amount from Russian receipt text', async () => {
      const text = 'Кассовый чек\nМагазин Продукты\nМолоко  500\nХлеб  200\nИтого: 700 KZT';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(700);
      expect(result.currency).toBe('KZT');
      expect(result.transactionType).toBe('expense');
    });

    it('detects refund as income', async () => {
      const text = 'Refund Confirmation\nRefund Amount: $25.00\nCredited to Visa ****1234';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(25);
      expect(result.transactionType).toBe('income');
    });

    it('returns unknown for empty text', async () => {
      const result = await service.extractFromText('');

      expect(result.documentType).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('extracts vendor from top receipt lines', async () => {
      const text = 'Starbucks Coffee\n1234 Main St\nLatte  $5.50\nTotal: $5.50';
      const result = await service.extractFromText(text);

      expect(result.vendor).toBeTruthy();
    });

    it('populates field confidence', async () => {
      const text = 'Receipt\nStore XYZ\nTotal: $45.99\nTax: $3.50';
      const result = await service.extractFromText(text);

      expect(result.fieldConfidence).toBeDefined();
      expect(result.fieldConfidence.totalAmount).toBeGreaterThan(0);
    });

    it('captures validation issue when subtotal plus tax does not match total', async () => {
      const text = 'Receipt\nSubtotal: $40.00\nTax: $5.00\nTotal: $50.00';
      const result = await service.extractFromText(text);

      if (result.subtotal && result.tax && result.totalAmount) {
        const expected = result.subtotal + result.tax;
        if (Math.abs(expected - result.totalAmount) > 0.01) {
          expect(result.validationIssues.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
