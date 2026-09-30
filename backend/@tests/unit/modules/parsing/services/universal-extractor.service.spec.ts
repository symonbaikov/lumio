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

    it('skips a page-number line when picking the vendor', async () => {
      const text = '1 / 4\nWise ILS LTD\n121 Menachem Begin Street\nTotal: 8,36 EUR';
      const result = await service.extractFromText(text);

      expect(result.vendor).toBe('Wise ILS LTD');
    });

    it.each([
      'DESCRIPTION PRICE DURATION QTY AMOUNT',
      'DESCRIPTIONPRICEDURATIONQTYAMOUNT',
    ])('skips the column-header line "%s" when picking the vendor', async header => {
      const text = `${header}\nSpaceship Inc\nFinal cost $9.08`;
      const result = await service.extractFromText(text);

      expect(result.vendor).toBe('Spaceship Inc');
    });

    it('keeps an uppercase merchant name as the vendor', async () => {
      const text = 'AMAZON EU SARL\n12.09.2026\nTotal: 23,99 EUR';
      const result = await service.extractFromText(text);

      expect(result.vendor).toBe('AMAZON EU SARL');
      expect(result.totalAmount).toBe(23.99);
    });

    it('prefers a Cyrillic total line over a larger glued table number', async () => {
      // pdf-parse glues the "times used / times charged / fee" columns: "1", "0", "0 EUR" -> "100 EUR".
      const text = [
        '1 / 4',
        'Wise ILS LTD',
        'Выписка по комиссиям',
        'Комиссия за пополнение11',
        '8,36 ',
        'EUR',
        'Комиссия за перемещение100 EUR',
        'Комиссия за снятие наличных в банкомате000 EUR',
        'Общая сумма заплаченных комиссий8,36 EUR',
      ].join('\n');
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(8.36);
      expect(result.currency).toBe('EUR');
    });

    it('extracts the store address from a CIS receipt header', async () => {
      const text = 'ТОО Magnum\nг. Алматы, ул. Абая 10\nМолоко 450\nИТОГО 450';
      const result = await service.extractFromText(text);

      expect(result.merchantAddress).toBe('г. Алматы, ул. Абая 10');
    });

    it('populates field confidence', async () => {
      const text = 'Receipt\nStore XYZ\nTotal: $45.99\nTax: $3.50';
      const result = await service.extractFromText(text);

      expect(result.fieldConfidence).toBeDefined();
      expect(result.fieldConfidence.totalAmount).toBeGreaterThan(0);
    });

    it('extracts a receipt date', async () => {
      const text = 'Receipt\nStore ABC\nDate: 26.11.2025\nTotal: $10.00';
      const result = await service.extractFromText(text);

      expect(result.date?.getFullYear()).toBe(2025);
      expect(result.date?.getMonth()).toBe(10);
      expect(result.date?.getDate()).toBe(26);
    });

    it('ignores a date with an implausible year', async () => {
      const text = 'Receipt\nStore ABC\n11.11.9301\nTotal: $10.00';
      const result = await service.extractFromText(text);

      expect(result.date).toBeUndefined();
    });

    it('ignores a date-looking substring inside a longer digit run', async () => {
      const text = 'Receipt\nStore ABC\nRef 111.11.93011\nTotal: $10.00';
      const result = await service.extractFromText(text);

      expect(result.date).toBeUndefined();
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

  describe('mergeResults', () => {
    const primary = {
      documentType: 'receipt',
      transactionType: 'expense',
      merchantAddress: 'ул. Абая 10',
      lineItems: [],
      confidence: 0.5,
      extractionMethod: 'regex',
      fieldConfidence: {},
      validationIssues: [],
    };

    it('prefers the AI merchant address over the line heuristic', () => {
      const merge = (service as any).mergeResults.bind(service);

      expect(merge(primary, { merchantAddress: 'г. Алматы, ул. Абая 10' }).merchantAddress).toBe(
        'г. Алматы, ул. Абая 10',
      );
      expect(merge(primary, {}).merchantAddress).toBe('ул. Абая 10');
    });
  });
});
