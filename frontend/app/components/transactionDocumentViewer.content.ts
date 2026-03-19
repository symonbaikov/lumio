import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'transactionDocumentViewer',
  content: {
    bankNotDetected: t({
      ru: 'Банк не определен',
      en: 'Bank not detected',
      kk: 'Банк анықталмаған',
    }),
    bankStatement: t({
      ru: 'Банковская выписка',
      en: 'Bank statement',
      kk: 'Банк үзіндісі',
    }),
    accountNumber: t({
      ru: 'Номер счета',
      en: 'Account number',
      kk: 'Есепшот нөмірі',
    }),
    statementPeriod: t({
      ru: 'Период выписки',
      en: 'Statement period',
      kk: 'Үзінді кезеңі',
    }),
    statementFile: t({
      ru: 'Файл выписки',
      en: 'Statement file',
      kk: 'Үзінді файлы',
    }),
    openingBalance: t({
      ru: 'Начальный баланс',
      en: 'Opening balance',
      kk: 'Бастапқы қалдық',
    }),
    income: t({
      ru: 'Поступления',
      en: 'Income',
      kk: 'Кіріс',
    }),
    expenses: t({
      ru: 'Списания',
      en: 'Expenses',
      kk: 'Шығыс',
    }),
    closingBalance: t({
      ru: 'Конечный баланс',
      en: 'Closing balance',
      kk: 'Соңғы қалдық',
    }),
    balanceChange: t({
      ru: 'Изменение баланса за период',
      en: 'Balance change for the period',
      kk: 'Кезең ішіндегі қалдық өзгерісі',
    }),
    totalTransactions: t({
      ru: 'Всего транзакций',
      en: 'Total transactions',
      kk: 'Барлық транзакциялар',
    }),
    transactionList: t({
      ru: 'Список транзакций',
      en: 'Transaction list',
      kk: 'Транзакциялар тізімі',
    }),
    transactionListDescription: t({
      ru: 'Детальная информация по всем операциям',
      en: 'Detailed information on all transactions',
      kk: 'Барлық операциялар бойынша толық ақпарат',
    }),
    columns: {
      date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
      documentNumber: t({ ru: 'Номер документа', en: 'Document number', kk: 'Құжат нөмірі' }),
      counterparty: t({ ru: 'Контрагент', en: 'Counterparty', kk: 'Контрагент' }),
      bin: t({ ru: 'БИН', en: 'BIN', kk: 'БСН' }),
      paymentPurpose: t({ ru: 'Назначение платежа', en: 'Payment purpose', kk: 'Төлем мақсаты' }),
      debit: t({ ru: 'Дебет', en: 'Debit', kk: 'Дебет' }),
      credit: t({ ru: 'Кредит', en: 'Credit', kk: 'Кредит' }),
      currency: t({ ru: 'Валюта', en: 'Currency', kk: 'Валюта' }),
    },
    total: t({ ru: 'ИТОГО:', en: 'TOTAL:', kk: 'БАРЛЫҒЫ:' }),
    totalExpenses: t({ ru: 'Всего списаний', en: 'Total expenses', kk: 'Барлық шығыстар' }),
    totalIncome: t({ ru: 'Всего поступлений', en: 'Total income', kk: 'Барлық кірістер' }),
    footer: t({
      ru: 'Документ сформирован автоматически • Lumio Parse Ledger',
      en: 'Document generated automatically • Lumio Parse Ledger',
      kk: 'Құжат автоматты түрде қалыптастырылды • Lumio Parse Ledger',
    }),
  },
} satisfies Dictionary;

export default content;
