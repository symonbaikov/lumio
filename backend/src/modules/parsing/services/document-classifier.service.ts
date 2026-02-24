import { Injectable } from '@nestjs/common';
import type { DocumentType } from '../interfaces/parsed-document.interface';

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  signals: string[];
}

export interface ClassificationOptions {
  fileNameHint?: string;
}

const RECEIPT_KEYWORDS = [
  'receipt',
  'чек',
  'кассовый чек',
  'товарный чек',
  'fiscal receipt',
  'payment receipt',
  'tax receipt',
  'purchase',
  'thank you for your purchase',
  'квитанция',
  'чек оплаты',
];

const INVOICE_KEYWORDS = [
  'invoice',
  'inv-',
  'инвойс',
  'счёт-фактура',
  'счет-фактура',
  'счёт на оплату',
  'счет на оплату',
  'bill to',
  'amount due',
  'payment terms',
  'due date',
  'net 30',
  'net 60',
  'к оплате до',
  'срок оплаты',
];

const STATEMENT_KEYWORDS = [
  'statement',
  'выписка',
  'account statement',
  'bank statement',
  'выписка по счёту',
  'выписка по счету',
  'выписка за период',
  'opening balance',
  'closing balance',
  'входящий остаток',
  'исходящий остаток',
  'остаток на начало',
  'остаток на конец',
  'дебет.*кредит.*остаток',
  'debit.*credit.*balance',
  'оборот за период',
  'итого оборот',
];

@Injectable()
export class DocumentClassifierService {
  classify(text: string, options?: ClassificationOptions): ClassificationResult {
    const lowerText = text.toLowerCase();
    const signals: string[] = [];
    let receiptScore = 0;
    let invoiceScore = 0;
    let statementScore = 0;

    if (options?.fileNameHint) {
      const lowerName = options.fileNameHint.toLowerCase();

      if (/receipt|чек|квитанция/.test(lowerName)) {
        receiptScore += 30;
        signals.push('filename:receipt');
      }

      if (/invoice|инвойс|счёт|счет/.test(lowerName)) {
        invoiceScore += 30;
        signals.push('filename:invoice');
      }

      if (/statement|выписка/.test(lowerName)) {
        statementScore += 30;
        signals.push('filename:statement');
      }
    }

    for (const keyword of RECEIPT_KEYWORDS) {
      if (!lowerText.includes(keyword)) {
        continue;
      }
      receiptScore += 20;
      signals.push(`receipt_keyword:${keyword}`);
    }

    for (const keyword of INVOICE_KEYWORDS) {
      if (!lowerText.includes(keyword)) {
        continue;
      }
      invoiceScore += 20;
      signals.push(`invoice_keyword:${keyword}`);
    }

    for (const keyword of STATEMENT_KEYWORDS) {
      const regex = new RegExp(keyword, 'i');
      if (!regex.test(lowerText)) {
        continue;
      }
      statementScore += 25;
      signals.push(`statement_keyword:${keyword}`);
    }

    const tableLineCount = (text.match(/\d+[\s.,-]+\d+.*\d+[\s.,-]+\d+/g) || []).length;
    if (tableLineCount >= 3) {
      statementScore += 20;
      signals.push(`table_structure:${tableLineCount}_rows`);
    }

    if (/\b(grand\s*)?total[:\s]/i.test(text) || /итого[:\s]/i.test(text)) {
      receiptScore += 15;
      signals.push('total_line');
    }

    const maxScore = Math.max(receiptScore, invoiceScore, statementScore);
    if (maxScore === 0) {
      return { documentType: 'unknown', confidence: 0, signals };
    }

    const totalScore = receiptScore + invoiceScore + statementScore || 1;

    let documentType: DocumentType;
    let confidence: number;
    if (statementScore === maxScore) {
      documentType = 'bank_statement';
      confidence = statementScore / totalScore;
    } else if (invoiceScore === maxScore) {
      documentType = 'invoice';
      confidence = invoiceScore / totalScore;
    } else {
      documentType = 'receipt';
      confidence = receiptScore / totalScore;
    }

    return {
      documentType,
      confidence: Math.round(Math.min(confidence + 0.1, 1) * 100) / 100,
      signals,
    };
  }
}
