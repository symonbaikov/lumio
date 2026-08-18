import { StatementQualityGate } from '@/modules/parsing/services/statement-quality-gate.service';

describe('StatementQualityGate', () => {
  const gate = new StatementQualityGate();

  it('blocks a statement with no valid transactions', () => {
    expect(
      gate.evaluate({
        validTransactions: [],
        droppedCount: 0,
        bankDetectionConflict: false,
        validationWarnings: [],
        aiReconciled: false,
      }),
    ).toMatchObject({ level: 'blocked', reasonCodes: ['no_valid_transactions'] });
  });

  it('requires review when balance validation reports a mismatch', () => {
    expect(
      gate.evaluate({
        validTransactions: [
          {
            transactionDate: new Date('2024-01-01'),
            counterpartyName: 'Supplier',
            paymentPurpose: 'Invoice',
            debit: 100,
          },
        ],
        droppedCount: 0,
        bankDetectionConflict: false,
        validationWarnings: ['Balance mismatch: expected 100.00 got 110.00'],
        aiReconciled: false,
      }),
    ).toMatchObject({ level: 'review', reasonCodes: ['balance_mismatch'] });
  });

  it('is ready only when parsing has no quality risks', () => {
    expect(
      gate.evaluate({
        validTransactions: [
          {
            transactionDate: new Date('2024-01-01'),
            counterpartyName: 'Supplier',
            paymentPurpose: 'Invoice',
            debit: 100,
          },
        ],
        droppedCount: 0,
        bankDetectionConflict: false,
        validationWarnings: [],
        aiReconciled: false,
      }),
    ).toMatchObject({ level: 'ready', reasonCodes: [] });
  });
});
