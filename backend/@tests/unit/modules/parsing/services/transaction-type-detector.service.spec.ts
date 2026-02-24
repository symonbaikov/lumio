import { TransactionTypeDetectorService } from '@/modules/parsing/services/transaction-type-detector.service';

describe('TransactionTypeDetectorService', () => {
  let service: TransactionTypeDetectorService;

  beforeEach(() => {
    service = new TransactionTypeDetectorService();
  });

  describe('detect', () => {
    it('detects expense for receipt text', () => {
      const result = service.detect({
        text: 'Receipt\nStore XYZ\nTotal: $45.99\nPayment: Visa ****1234',
        documentType: 'receipt',
      });

      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects expense for Russian receipt with оплата', () => {
      const result = service.detect({
        text: 'Чек\nОплата покупки\nИтого: 5 000 KZT',
        documentType: 'receipt',
      });

      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects income for refund text', () => {
      const result = service.detect({
        text: 'Refund confirmation\nAmount credited: $25.00\nRefund to Visa ****1234',
        documentType: 'receipt',
      });

      expect(result.direction).toBe('income');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('detects income for Russian возврат', () => {
      const result = service.detect({
        text: 'Возврат средств\nСумма зачисления: 10 000 KZT',
        documentType: 'receipt',
      });

      expect(result.direction).toBe('income');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('detects expense for negative amount', () => {
      const result = service.detect({
        text: 'Transaction: -$150.00',
        amount: -150,
      });

      expect(result.direction).toBe('expense');
    });

    it('detects income for credit in bank statement', () => {
      const result = service.detect({
        text: 'Зачисление на счёт\nКредит: 500 000 KZT',
        documentType: 'bank_statement',
        hasCredit: true,
        hasDebit: false,
      });

      expect(result.direction).toBe('income');
    });

    it('detects expense for debit in bank statement', () => {
      const result = service.detect({
        text: 'Списание со счёта\nДебет: 50 000 KZT',
        documentType: 'bank_statement',
        hasDebit: true,
        hasCredit: false,
      });

      expect(result.direction).toBe('expense');
    });

    it('returns unknown with low confidence when no signals are found', () => {
      const result = service.detect({
        text: 'Some random text without financial signals',
      });

      expect(result.direction).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('detects expense for invoice context', () => {
      const result = service.detect({
        text: 'Invoice #12345\nAmount Due: $1,200.00\nPayment Terms: Net 30',
        documentType: 'invoice',
      });

      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('detects income for deposit keyword', () => {
      const result = service.detect({
        text: 'Deposit received\nAmount: $5,000.00',
      });

      expect(result.direction).toBe('income');
    });

    it('detects transfer for transfer keyword', () => {
      const result = service.detect({
        text: 'Перевод между счетами\nСумма: 100 000 KZT',
      });

      expect(result.direction).toBe('transfer');
    });
  });
});
