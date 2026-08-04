import { BaseTabularParser } from '@/modules/parsing/parsers/base-tabular.parser';

class TestTabularParser extends BaseTabularParser {
  async canParse() {
    return true;
  }

  async parse() {
    throw new Error('not implemented');
  }
}

describe('BaseTabularParser', () => {
  const parser = new TestTabularParser();

  it('maps tabular headers into semantic columns', () => {
    const mapping = parser['mapColumns']([
      'Дата',
      'Документ',
      'Контрагент',
      'БИН',
      'Счет',
      'Банк',
      'Дебет',
      'Кредит',
      'Назначение',
    ]);

    expect(mapping).toEqual({
      date: 0,
      document: 1,
      counterparty: 2,
      bin: 3,
      account: 4,
      bank: 5,
      debit: 6,
      credit: 7,
      purpose: 8,
    });
  });

  it('parses row values into ParsedTransaction', () => {
    const transaction = parser['parseRow'](
      ['2026-01-15', 'DOC-1', 'Acme', '123456789012', 'KZ123', 'HSBK', '1200.50', '', 'Invoice payment'],
      {
        date: 0,
        document: 1,
        counterparty: 2,
        bin: 3,
        account: 4,
        bank: 5,
        debit: 6,
        credit: 7,
        purpose: 8,
      },
      index => ['2026-01-15', 'DOC-1', 'Acme', '123456789012', 'KZ123', 'HSBK', '1200.50', '', 'Invoice payment'][index],
    );

    expect(transaction).toMatchObject({
      documentNumber: 'DOC-1',
      counterpartyName: 'Acme',
      counterpartyBin: '123456789012',
      counterpartyAccount: 'KZ123',
      counterpartyBank: 'HSBK',
      debit: 1200.5,
      credit: undefined,
      paymentPurpose: 'Invoice payment',
      // No currency column and no defaultCurrency argument, so none is inferred.
      currency: undefined,
    });
  });
});
