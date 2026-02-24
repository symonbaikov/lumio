import { Injectable } from '@nestjs/common';
import type { DocumentType, TransactionDirection } from '../interfaces/parsed-document.interface';

export interface TypeDetectionInput {
  text: string;
  documentType?: DocumentType;
  amount?: number;
  hasDebit?: boolean;
  hasCredit?: boolean;
  sender?: string;
  subject?: string;
}

export interface TypeDetectionResult {
  direction: TransactionDirection;
  confidence: number;
  signals: string[];
}

const EXPENSE_KEYWORDS_EN = [
  'payment',
  'purchase',
  'charge',
  'paid',
  'debit',
  'deducted',
  'withdrawal',
  'spent',
  'expense',
  'billing',
  'amount due',
  'invoice',
  'order',
  'buy',
  'bought',
];

const EXPENSE_KEYWORDS_RU = [
  'оплата',
  'покупка',
  'списание',
  'платёж',
  'платеж',
  'расход',
  'дебет',
  'снятие',
  'к оплате',
  'стоимость',
  'счёт',
  'счет',
  'удержано',
  'комиссия',
];

const INCOME_KEYWORDS_EN = [
  'refund',
  'credit',
  'deposit',
  'received',
  'incoming',
  'reimbursement',
  'cashback',
  'reward',
  'rebate',
  'return',
  'credited',
  'salary',
  'wage',
  'dividend',
  'interest earned',
];

const INCOME_KEYWORDS_RU = [
  'возврат',
  'зачисление',
  'приход',
  'кредит',
  'поступление',
  'получено',
  'пополнение',
  'доход',
  'зарплата',
  'кэшбэк',
  'начисление',
  'вознаграждение',
  'процентный доход',
];

const TRANSFER_KEYWORDS_EN = [
  'transfer between',
  'internal transfer',
  'own account',
  'self transfer',
];

const TRANSFER_KEYWORDS_RU = [
  'перевод между',
  'внутренний перевод',
  'перевод на свой',
  'собственный счёт',
  'собственный счет',
];

const STRONG_INCOME_SIGNAL_PATTERNS = [
  'refund',
  'credited',
  'reimbursement',
  'возврат',
  'зачислен',
  'поступлен',
];

@Injectable()
export class TransactionTypeDetectorService {
  detect(input: TypeDetectionInput): TypeDetectionResult {
    const signals: string[] = [];
    let expenseScore = 0;
    let incomeScore = 0;
    let transferScore = 0;

    const lowerText = input.text.toLowerCase();

    if (input.documentType === 'receipt') {
      expenseScore += 30;
      signals.push('document_type:receipt');
    } else if (input.documentType === 'invoice') {
      expenseScore += 25;
      signals.push('document_type:invoice');
    }

    if (input.amount !== undefined) {
      if (input.amount < 0) {
        expenseScore += 40;
        signals.push('negative_amount');
      } else if (input.amount > 0 && input.documentType === 'bank_statement') {
        incomeScore += 20;
        signals.push('positive_amount_statement');
      }
    }

    if (input.hasDebit && !input.hasCredit) {
      expenseScore += 50;
      signals.push('debit_only');
    } else if (input.hasCredit && !input.hasDebit) {
      incomeScore += 50;
      signals.push('credit_only');
    }

    for (const keyword of [...TRANSFER_KEYWORDS_EN, ...TRANSFER_KEYWORDS_RU]) {
      if (lowerText.includes(keyword)) {
        transferScore += 40;
        signals.push(`transfer_keyword:${keyword}`);
        break;
      }
    }

    if (STRONG_INCOME_SIGNAL_PATTERNS.some(pattern => lowerText.includes(pattern))) {
      incomeScore += 35;
      signals.push('strong_income_signal');
    }

    let expenseKeywordCount = 0;
    for (const keyword of [...EXPENSE_KEYWORDS_EN, ...EXPENSE_KEYWORDS_RU]) {
      if (!lowerText.includes(keyword)) {
        continue;
      }

      expenseKeywordCount += 1;
      if (expenseKeywordCount <= 3) {
        expenseScore += 20;
        signals.push(`expense_keyword:${keyword}`);
      }
    }

    let incomeKeywordCount = 0;
    for (const keyword of [...INCOME_KEYWORDS_EN, ...INCOME_KEYWORDS_RU]) {
      if (!lowerText.includes(keyword)) {
        continue;
      }

      incomeKeywordCount += 1;
      if (incomeKeywordCount <= 3) {
        incomeScore += 25;
        signals.push(`income_keyword:${keyword}`);
      }
    }

    const maxScore = Math.max(expenseScore, incomeScore, transferScore);
    const totalSignalWeight = expenseScore + incomeScore + transferScore || 1;

    let direction: TransactionDirection;
    let confidence: number;

    if (maxScore === 0) {
      direction = 'unknown';
      confidence = 0;
    } else if (transferScore === maxScore && transferScore > 30) {
      direction = 'transfer';
      confidence = Math.min(transferScore / totalSignalWeight + 0.2, 1);
    } else if (expenseScore >= incomeScore) {
      direction = 'expense';
      confidence = Math.min(expenseScore / totalSignalWeight + 0.1, 1);
    } else {
      direction = 'income';
      confidence = Math.min(incomeScore / totalSignalWeight + 0.1, 1);
    }

    return {
      direction,
      confidence: Math.round(confidence * 100) / 100,
      signals,
    };
  }
}
