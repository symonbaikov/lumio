import {
  getExcludedColumnIndexes,
  mapPdfTableRowsToTransactions,
} from '@/modules/parsing/helpers/pdf-table.helper';

describe('pdf-table.helper', () => {
  it('collects excluded column indexes for the provided keys', () => {
    expect(
      getExcludedColumnIndexes(
        {
          date: 0,
          document: 1,
          debit: 5,
          credit: 6,
          purpose: 7,
        },
        ['date', 'document', 'debit', 'credit', 'purpose'],
      ),
    ).toEqual(new Set([0, 1, 5, 6, 7]));
  });

  it('maps debit and credit by their header labels instead of numeric column order', () => {
    const transactions = mapPdfTableRowsToTransactions([
      ['Назначение', 'Кредит', 'Дата', 'Контрагент', 'Дебет', 'Номер'],
      ['Оплата услуг', '', '05.01.2024', 'Поставщик', '1 250,50', 'DOC-1'],
      ['Возврат', '300,00', '06.01.2024', 'Клиент', '', 'DOC-2'],
    ]);

    expect(transactions).toEqual([
      expect.objectContaining({
        documentNumber: 'DOC-1',
        debit: 1250.5,
        credit: undefined,
        counterpartyName: 'Поставщик',
        paymentPurpose: 'Оплата услуг',
      }),
      expect.objectContaining({
        documentNumber: 'DOC-2',
        debit: undefined,
        credit: 300,
        counterpartyName: 'Клиент',
        paymentPurpose: 'Возврат',
      }),
    ]);
  });
});
