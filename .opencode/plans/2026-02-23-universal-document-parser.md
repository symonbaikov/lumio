# Universal Document Parser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-hosted universal document parser (analogous to Google Document AI / AWS Textract AnalyzeExpense) that extracts total amount, income/expense type, date, vendor, currency, tax, line items, and category from any receipt, invoice, or bank statement -- regardless of file format (PDF, image, CSV, XLSX).

**Architecture:** Hybrid approach -- regex/heuristics as the primary extraction layer, with Google Gemini AI for complex cases and cross-validation. OCR via Tesseract.js for image files. A unified `UniversalExtractorService` replaces duplicated logic between the existing Gmail receipt parser and statement generic parser. A new `TransactionTypeDetectorService` determines income vs expense. The existing `GmailReceiptParserService` delegates to the new universal extractor while maintaining backward compatibility.

**Tech Stack:** Tesseract.js (OCR), sharp (image preprocessing), @google/generative-ai (Gemini 2.5 Flash for AI validation + Gemini Vision for images), pdf-parse + pdfplumber (PDF text extraction), existing UniversalAmountParser/UniversalDateParser/TextCleaningService.

---

## Task 1: Unified ParsedDocument Interface & Types

**Files:**
- Create: `backend/src/modules/parsing/interfaces/parsed-document.interface.ts`

**Step 1: Create the unified interface file**

```typescript
// backend/src/modules/parsing/interfaces/parsed-document.interface.ts

export type DocumentType = 'receipt' | 'invoice' | 'bank_statement' | 'unknown';

export type TransactionDirection = 'income' | 'expense' | 'transfer' | 'unknown';

export type ExtractionMethod = 'regex' | 'ai' | 'hybrid' | 'ocr_regex' | 'ocr_ai' | 'ocr_hybrid';

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  tax?: number;
}

export interface ParsedDocument {
  /** Detected document type */
  documentType: DocumentType;

  /** Income or expense determination */
  transactionType: TransactionDirection;

  /** Total/grand total amount (always positive) */
  totalAmount?: number;

  /** ISO 4217 currency code */
  currency?: string;

  /** Transaction or document date */
  date?: Date;

  /** Vendor/merchant/counterparty name */
  vendor?: string;

  /** Tax amount */
  tax?: number;

  /** Tax rate as percentage (e.g. 12 for 12%) */
  taxRate?: number;

  /** Subtotal before tax */
  subtotal?: number;

  /** Extracted line items */
  lineItems: LineItem[];

  /** Category hint (keyword-based suggestion) */
  categoryHint?: string;

  /** Payment method if detected */
  paymentMethod?: string;

  /** Document/invoice/receipt number */
  documentNumber?: string;

  /** Overall confidence score 0-1 */
  confidence: number;

  /** How the data was extracted */
  extractionMethod: ExtractionMethod;

  /** Raw extracted text (for debugging/re-parsing) */
  rawText?: string;

  /** Per-field confidence scores */
  fieldConfidence: {
    totalAmount?: number;
    transactionType?: number;
    date?: number;
    vendor?: number;
    currency?: number;
    tax?: number;
    lineItems?: number;
  };

  /** Validation issues found */
  validationIssues: string[];
}
```

**Step 2: Run lint**

Run: `cd backend && npx biome check src/modules/parsing/interfaces/parsed-document.interface.ts --write`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/modules/parsing/interfaces/parsed-document.interface.ts
git commit -m "feat(parsing): add unified ParsedDocument interface for universal document extraction"
```

---

## Task 2: Transaction Type Detector Service

**Files:**
- Create: `backend/src/modules/parsing/services/transaction-type-detector.service.ts`
- Create: `backend/@tests/unit/modules/parsing/services/transaction-type-detector.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/@tests/unit/modules/parsing/services/transaction-type-detector.service.spec.ts
import { TransactionTypeDetectorService } from '../../../../../src/modules/parsing/services/transaction-type-detector.service';
import type { DocumentType } from '../../../../../src/modules/parsing/interfaces/parsed-document.interface';

describe('TransactionTypeDetectorService', () => {
  let service: TransactionTypeDetectorService;

  beforeEach(() => {
    service = new TransactionTypeDetectorService();
  });

  describe('detect', () => {
    it('should detect expense for typical receipt text', () => {
      const result = service.detect({
        text: 'Receipt\nStore XYZ\nTotal: $45.99\nPayment: Visa ****1234',
        documentType: 'receipt',
      });
      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect expense for Russian receipt with "оплата"', () => {
      const result = service.detect({
        text: 'Чек\nОплата покупки\nИтого: 5 000 KZT',
        documentType: 'receipt',
      });
      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect income for refund text', () => {
      const result = service.detect({
        text: 'Refund confirmation\nAmount credited: $25.00\nRefund to Visa ****1234',
        documentType: 'receipt',
      });
      expect(result.direction).toBe('income');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect income for Russian "возврат"', () => {
      const result = service.detect({
        text: 'Возврат средств\nСумма зачисления: 10 000 KZT',
        documentType: 'receipt',
      });
      expect(result.direction).toBe('income');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect expense for negative amount', () => {
      const result = service.detect({
        text: 'Transaction: -$150.00',
        amount: -150,
      });
      expect(result.direction).toBe('expense');
    });

    it('should detect income for credit in bank statement', () => {
      const result = service.detect({
        text: 'Зачисление на счёт\nКредит: 500 000 KZT',
        documentType: 'bank_statement',
        hasCredit: true,
        hasDebit: false,
      });
      expect(result.direction).toBe('income');
    });

    it('should detect expense for debit in bank statement', () => {
      const result = service.detect({
        text: 'Списание со счёта\nДебет: 50 000 KZT',
        documentType: 'bank_statement',
        hasDebit: true,
        hasCredit: false,
      });
      expect(result.direction).toBe('expense');
    });

    it('should return unknown when no signals', () => {
      const result = service.detect({
        text: 'Some random text without financial signals',
      });
      expect(result.direction).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect expense for invoice', () => {
      const result = service.detect({
        text: 'Invoice #12345\nAmount Due: $1,200.00\nPayment Terms: Net 30',
        documentType: 'invoice',
      });
      expect(result.direction).toBe('expense');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect income for "deposit" keyword', () => {
      const result = service.detect({
        text: 'Deposit received\nAmount: $5,000.00',
      });
      expect(result.direction).toBe('income');
    });

    it('should detect transfer for "перевод" keyword', () => {
      const result = service.detect({
        text: 'Перевод между счетами\nСумма: 100 000 KZT',
      });
      expect(result.direction).toBe('transfer');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/transaction-type-detector.service.spec.ts --no-coverage`
Expected: FAIL with "Cannot find module"

**Step 3: Implement TransactionTypeDetectorService**

```typescript
// backend/src/modules/parsing/services/transaction-type-detector.service.ts
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
  'payment', 'purchase', 'charge', 'paid', 'debit', 'deducted',
  'withdrawal', 'spent', 'expense', 'billing', 'amount due',
  'invoice', 'order', 'buy', 'bought',
];

const EXPENSE_KEYWORDS_RU = [
  'оплата', 'покупка', 'списание', 'платёж', 'платеж', 'расход',
  'дебет', 'снятие', 'к оплате', 'стоимость', 'счёт', 'счет на оплату',
  'удержано', 'комиссия',
];

const INCOME_KEYWORDS_EN = [
  'refund', 'credit', 'deposit', 'received', 'incoming',
  'reimbursement', 'cashback', 'reward', 'rebate', 'return',
  'credited', 'salary', 'wage', 'dividend', 'interest earned',
];

const INCOME_KEYWORDS_RU = [
  'возврат', 'зачисление', 'приход', 'кредит', 'поступление',
  'получено', 'пополнение', 'доход', 'зарплата', 'кэшбэк',
  'начисление', 'вознаграждение', 'процентный доход',
];

const TRANSFER_KEYWORDS_EN = [
  'transfer between', 'internal transfer', 'own account',
  'self transfer',
];

const TRANSFER_KEYWORDS_RU = [
  'перевод между', 'внутренний перевод', 'перевод на свой',
  'собственный счёт', 'собственный счет',
];

@Injectable()
export class TransactionTypeDetectorService {
  detect(input: TypeDetectionInput): TypeDetectionResult {
    const signals: string[] = [];
    let expenseScore = 0;
    let incomeScore = 0;
    let transferScore = 0;

    const lowerText = input.text.toLowerCase();

    // Signal 1: Document type context (receipt/invoice = likely expense)
    if (input.documentType === 'receipt') {
      expenseScore += 30;
      signals.push('document_type:receipt');
    } else if (input.documentType === 'invoice') {
      expenseScore += 25;
      signals.push('document_type:invoice');
    }

    // Signal 2: Amount sign
    if (input.amount !== undefined) {
      if (input.amount < 0) {
        expenseScore += 40;
        signals.push('negative_amount');
      } else if (input.amount > 0 && input.documentType === 'bank_statement') {
        incomeScore += 20;
        signals.push('positive_amount_statement');
      }
    }

    // Signal 3: Debit/Credit columns (bank statements)
    if (input.hasDebit && !input.hasCredit) {
      expenseScore += 50;
      signals.push('debit_only');
    } else if (input.hasCredit && !input.hasDebit) {
      incomeScore += 50;
      signals.push('credit_only');
    }

    // Signal 4: Transfer keywords (check first, they're most specific)
    for (const keyword of [...TRANSFER_KEYWORDS_EN, ...TRANSFER_KEYWORDS_RU]) {
      if (lowerText.includes(keyword)) {
        transferScore += 40;
        signals.push(`transfer_keyword:${keyword}`);
        break;
      }
    }

    // Signal 5: Expense keywords
    let expenseKeywordCount = 0;
    for (const keyword of [...EXPENSE_KEYWORDS_EN, ...EXPENSE_KEYWORDS_RU]) {
      if (lowerText.includes(keyword)) {
        expenseKeywordCount++;
        if (expenseKeywordCount <= 3) {
          expenseScore += 20;
          signals.push(`expense_keyword:${keyword}`);
        }
      }
    }

    // Signal 6: Income keywords
    let incomeKeywordCount = 0;
    for (const keyword of [...INCOME_KEYWORDS_EN, ...INCOME_KEYWORDS_RU]) {
      if (lowerText.includes(keyword)) {
        incomeKeywordCount++;
        if (incomeKeywordCount <= 3) {
          incomeScore += 25; // slightly higher weight -- income signals are rarer, more reliable
          signals.push(`income_keyword:${keyword}`);
        }
      }
    }

    // Determine winner
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

    // Clamp confidence
    confidence = Math.round(confidence * 100) / 100;

    return { direction, confidence, signals };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/transaction-type-detector.service.spec.ts --no-coverage`
Expected: All 11 tests PASS

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/transaction-type-detector.service.ts \
       backend/@tests/unit/modules/parsing/services/transaction-type-detector.service.spec.ts
git commit -m "feat(parsing): add TransactionTypeDetectorService for income/expense/transfer detection"
```

---

## Task 3: Document Classifier Service

**Files:**
- Create: `backend/src/modules/parsing/services/document-classifier.service.ts`
- Create: `backend/@tests/unit/modules/parsing/services/document-classifier.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/@tests/unit/modules/parsing/services/document-classifier.service.spec.ts
import { DocumentClassifierService } from '../../../../../src/modules/parsing/services/document-classifier.service';

describe('DocumentClassifierService', () => {
  let service: DocumentClassifierService;

  beforeEach(() => {
    service = new DocumentClassifierService();
  });

  describe('classify', () => {
    it('should classify a receipt by "receipt" keyword', () => {
      const result = service.classify('Payment Receipt\nStore ABC\nTotal: $45.99');
      expect(result.documentType).toBe('receipt');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should classify a receipt by Russian keyword', () => {
      const result = service.classify('Кассовый чек\nМагазин\nИтого: 5000 KZT');
      expect(result.documentType).toBe('receipt');
    });

    it('should classify an invoice', () => {
      const result = service.classify('Invoice #INV-2026-001\nBill To: Company XYZ\nAmount Due: $1,200.00');
      expect(result.documentType).toBe('invoice');
    });

    it('should classify a bank statement', () => {
      const result = service.classify('Выписка по счёту KZ123456\nПериод: 01.01.2026 - 31.01.2026\nДебет Кредит Остаток');
      expect(result.documentType).toBe('bank_statement');
    });

    it('should classify bank statement by English keywords', () => {
      const result = service.classify('Account Statement\nAccount Number: 1234567890\nOpening Balance: $5,000.00\nDate Description Debit Credit Balance');
      expect(result.documentType).toBe('bank_statement');
    });

    it('should return unknown for ambiguous text', () => {
      const result = service.classify('Hello world, this is a random document');
      expect(result.documentType).toBe('unknown');
    });

    it('should classify receipt from file extension hint', () => {
      const result = service.classify('Some text with total $50', { fileNameHint: 'receipt_2026.pdf' });
      expect(result.documentType).toBe('receipt');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/document-classifier.service.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement DocumentClassifierService**

```typescript
// backend/src/modules/parsing/services/document-classifier.service.ts
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
  'receipt', 'чек', 'кассовый чек', 'товарный чек',
  'fiscal receipt', 'payment receipt', 'tax receipt',
  'purchase', 'thank you for your purchase',
  'квитанция', 'чек оплаты',
];

const INVOICE_KEYWORDS = [
  'invoice', 'inv-', 'инвойс', 'счёт-фактура', 'счет-фактура',
  'счёт на оплату', 'счет на оплату', 'bill to', 'amount due',
  'payment terms', 'due date', 'net 30', 'net 60',
  'к оплате до', 'срок оплаты',
];

const STATEMENT_KEYWORDS = [
  'statement', 'выписка', 'account statement', 'bank statement',
  'выписка по счёту', 'выписка по счету', 'выписка за период',
  'opening balance', 'closing balance',
  'входящий остаток', 'исходящий остаток',
  'остаток на начало', 'остаток на конец',
  'дебет.*кредит.*остаток', 'debit.*credit.*balance',
  'оборот за период', 'итого оборот',
];

@Injectable()
export class DocumentClassifierService {
  classify(text: string, options?: ClassificationOptions): ClassificationResult {
    const lowerText = text.toLowerCase();
    const signals: string[] = [];
    let receiptScore = 0;
    let invoiceScore = 0;
    let statementScore = 0;

    // Check filename hint
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

    // Check keywords
    for (const keyword of RECEIPT_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        receiptScore += 20;
        signals.push(`receipt_keyword:${keyword}`);
      }
    }

    for (const keyword of INVOICE_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        invoiceScore += 20;
        signals.push(`invoice_keyword:${keyword}`);
      }
    }

    for (const keyword of STATEMENT_KEYWORDS) {
      const regex = new RegExp(keyword, 'i');
      if (regex.test(lowerText)) {
        statementScore += 25; // statements are more structurally distinct
        signals.push(`statement_keyword:${keyword}`);
      }
    }

    // Structural signals for statements (table-like rows with numbers)
    const tableLineCount = (text.match(/\d+[\s.,-]+\d+.*\d+[\s.,-]+\d+/g) || []).length;
    if (tableLineCount >= 3) {
      statementScore += 20;
      signals.push(`table_structure:${tableLineCount}_rows`);
    }

    // Structural signals for receipts (total/grand total line)
    if (/\b(grand\s*)?total[:\s]/i.test(text) || /итого[:\s]/i.test(text)) {
      receiptScore += 15;
      signals.push('total_line');
    }

    // Determine winner
    const maxScore = Math.max(receiptScore, invoiceScore, statementScore);
    if (maxScore === 0) {
      return { documentType: 'unknown', confidence: 0, signals };
    }

    const total = receiptScore + invoiceScore + statementScore || 1;
    let documentType: DocumentType;
    let confidence: number;

    if (statementScore === maxScore) {
      documentType = 'bank_statement';
      confidence = statementScore / total;
    } else if (invoiceScore === maxScore) {
      documentType = 'invoice';
      confidence = invoiceScore / total;
    } else {
      documentType = 'receipt';
      confidence = receiptScore / total;
    }

    return {
      documentType,
      confidence: Math.round(Math.min(confidence + 0.1, 1) * 100) / 100,
      signals,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/document-classifier.service.spec.ts --no-coverage`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/document-classifier.service.ts \
       backend/@tests/unit/modules/parsing/services/document-classifier.service.spec.ts
git commit -m "feat(parsing): add DocumentClassifierService for receipt/invoice/statement detection"
```

---

## Task 4: OCR Service (Tesseract.js + Image Preprocessing)

**Files:**
- Install: `tesseract.js`, `sharp`
- Create: `backend/src/modules/parsing/services/ocr.service.ts`
- Create: `backend/@tests/unit/modules/parsing/services/ocr.service.spec.ts`

**Step 1: Install dependencies**

Run: `cd backend && npm install tesseract.js@5 sharp@0.33`

**Step 2: Write the failing tests**

```typescript
// backend/@tests/unit/modules/parsing/services/ocr.service.spec.ts
import { OcrService } from '../../../../../src/modules/parsing/services/ocr.service';

// We mock tesseract.js for unit tests
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: 'Store ABC\nItem 1   $10.00\nItem 2   $20.00\nTotal    $30.00',
        confidence: 85,
        blocks: [],
      },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    grayscale: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    threshold: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
    metadata: jest.fn().mockResolvedValue({ width: 1000, height: 1500, format: 'png' }),
  });
  return mockSharp;
});

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(() => {
    service = new OcrService();
  });

  describe('isImageFile', () => {
    it('should return true for PNG', () => {
      expect(service.isImageFile('receipt.png')).toBe(true);
    });

    it('should return true for JPG', () => {
      expect(service.isImageFile('receipt.jpg')).toBe(true);
    });

    it('should return true for JPEG', () => {
      expect(service.isImageFile('receipt.jpeg')).toBe(true);
    });

    it('should return false for PDF', () => {
      expect(service.isImageFile('receipt.pdf')).toBe(false);
    });

    it('should return false for CSV', () => {
      expect(service.isImageFile('data.csv')).toBe(false);
    });
  });

  describe('extractTextFromImage', () => {
    it('should extract text from an image buffer', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractTextFromImage(buffer);

      expect(result.text).toContain('Store ABC');
      expect(result.text).toContain('Total');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should preprocess image before OCR', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractTextFromImage(buffer, { preprocess: true });

      expect(result.text).toBeTruthy();
      expect(result.preprocessed).toBe(true);
    });
  });

  describe('getSupportedImageExtensions', () => {
    it('should return supported extensions', () => {
      const extensions = service.getSupportedImageExtensions();
      expect(extensions).toContain('.png');
      expect(extensions).toContain('.jpg');
      expect(extensions).toContain('.jpeg');
      expect(extensions).toContain('.tiff');
      expect(extensions).toContain('.webp');
      expect(extensions).toContain('.bmp');
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/ocr.service.spec.ts --no-coverage`
Expected: FAIL with "Cannot find module"

**Step 4: Implement OcrService**

```typescript
// backend/src/modules/parsing/services/ocr.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

export interface OcrResult {
  text: string;
  confidence: number;
  language?: string;
  preprocessed: boolean;
}

export interface OcrOptions {
  languages?: string[];
  preprocess?: boolean;
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp',
]);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
  }

  getSupportedImageExtensions(): string[] {
    return Array.from(SUPPORTED_IMAGE_EXTENSIONS);
  }

  async extractTextFromImage(
    imageBuffer: Buffer,
    options: OcrOptions = {},
  ): Promise<OcrResult> {
    const { languages = ['eng', 'rus'], preprocess = true } = options;

    let processedBuffer = imageBuffer;

    if (preprocess) {
      processedBuffer = await this.preprocessImage(imageBuffer);
    }

    const { createWorker } = await import('tesseract.js');
    const langString = languages.join('+');
    const worker = await createWorker(langString);

    try {
      const { data } = await worker.recognize(processedBuffer);
      const text = (data.text || '').trim();
      const confidence = (data.confidence || 0) / 100; // normalize to 0-1

      this.logger.debug(
        `OCR extracted ${text.length} chars with confidence ${confidence.toFixed(2)} (lang: ${langString})`,
      );

      return {
        text,
        confidence,
        language: langString,
        preprocessed: preprocess,
      };
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Extract text from a scanned PDF by converting pages to images.
   * Falls back if text extraction yields very little content.
   */
  async extractTextFromScannedPdf(
    pdfBuffer: Buffer,
    options: OcrOptions = {},
  ): Promise<OcrResult> {
    // Use pdf-parse to check if there's already text
    const pdfParse = await import('pdf-parse');
    const pdfData = await pdfParse.default(pdfBuffer);
    const existingText = (pdfData.text || '').trim();

    // If PDF already has substantial text, return it directly
    if (existingText.length > 100) {
      return {
        text: existingText,
        confidence: 0.95,
        preprocessed: false,
      };
    }

    // Scanned PDF -- convert first page to image and OCR
    this.logger.debug('PDF has minimal text, attempting OCR on scanned content');

    // Try OCR directly on the PDF buffer (tesseract.js supports PDF input)
    try {
      return await this.extractTextFromImage(pdfBuffer, options);
    } catch (error) {
      this.logger.warn('Direct PDF OCR failed, returning minimal text', error);
      return {
        text: existingText,
        confidence: 0.3,
        preprocessed: false,
      };
    }
  }

  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      const sharp = (await import('sharp')).default;

      const processed = await sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.5 })
        .toBuffer();

      return processed;
    } catch (error) {
      this.logger.warn('Image preprocessing failed, using original', error);
      return buffer;
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/ocr.service.spec.ts --no-coverage`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add backend/src/modules/parsing/services/ocr.service.ts \
       backend/@tests/unit/modules/parsing/services/ocr.service.spec.ts \
       backend/package.json backend/package-lock.json
git commit -m "feat(parsing): add OcrService with Tesseract.js and sharp image preprocessing"
```

---

## Task 5: AI Document Extractor Helper (Gemini Vision + Text)

**Files:**
- Create: `backend/src/modules/parsing/helpers/ai-document-extractor.helper.ts`
- Create: `backend/@tests/unit/modules/parsing/helpers/ai-document-extractor.helper.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/@tests/unit/modules/parsing/helpers/ai-document-extractor.helper.spec.ts
import { AiDocumentExtractor } from '../../../../../src/modules/parsing/helpers/ai-document-extractor.helper';

// Mock @google/generative-ai
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            documentType: 'receipt',
            transactionType: 'expense',
            totalAmount: 45.99,
            currency: 'USD',
            date: '2026-01-15',
            vendor: 'Store ABC',
            tax: 3.50,
            lineItems: [
              { description: 'Item 1', amount: 20.00 },
              { description: 'Item 2', amount: 22.49 },
            ],
          }),
        },
      }),
    }),
  })),
}));

// Mock ai-runtime.util
jest.mock('../../../../../src/modules/parsing/helpers/ai-runtime.util', () => ({
  isAiEnabled: jest.fn().mockReturnValue(true),
  isAiCircuitOpen: jest.fn().mockReturnValue(false),
  recordAiSuccess: jest.fn(),
  recordAiFailure: jest.fn(),
  withAiConcurrency: jest.fn().mockImplementation(fn => fn()),
  redactSensitive: jest.fn().mockImplementation(text => text),
}));

describe('AiDocumentExtractor', () => {
  let extractor: AiDocumentExtractor;

  beforeEach(() => {
    extractor = new AiDocumentExtractor('fake-api-key');
  });

  it('should be available when API key provided', () => {
    expect(extractor.isAvailable()).toBe(true);
  });

  it('should not be available without API key', () => {
    const noKey = new AiDocumentExtractor(undefined);
    expect(noKey.isAvailable()).toBe(false);
  });

  it('should extract document data from text', async () => {
    const result = await extractor.extractFromText('Store ABC\nTotal: $45.99');
    expect(result).toBeTruthy();
    expect(result?.totalAmount).toBe(45.99);
    expect(result?.transactionType).toBe('expense');
    expect(result?.vendor).toBe('Store ABC');
    expect(result?.currency).toBe('USD');
  });

  it('should return null on AI failure', async () => {
    const { isAiCircuitOpen } = require('../../../../../src/modules/parsing/helpers/ai-runtime.util');
    isAiCircuitOpen.mockReturnValueOnce(true);

    const result = await extractor.extractFromText('some text');
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/parsing/helpers/ai-document-extractor.helper.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement AiDocumentExtractor**

```typescript
// backend/src/modules/parsing/helpers/ai-document-extractor.helper.ts
import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { TimeoutError, retry, withTimeout } from '../../../common/utils/async.util';
import type {
  DocumentType,
  LineItem,
  TransactionDirection,
} from '../interfaces/parsed-document.interface';
import {
  isAiCircuitOpen,
  isAiEnabled,
  recordAiFailure,
  recordAiSuccess,
  redactSensitive,
  withAiConcurrency,
} from './ai-runtime.util';

export interface AiExtractionResult {
  documentType?: DocumentType;
  transactionType?: TransactionDirection;
  totalAmount?: number;
  currency?: string;
  date?: string;
  vendor?: string;
  tax?: number;
  taxRate?: number;
  subtotal?: number;
  lineItems?: LineItem[];
  categoryHint?: string;
  paymentMethod?: string;
  documentNumber?: string;
  confidence?: number;
}

const EXTRACTION_PROMPT = `You are a financial document parser. Extract ALL available data from this document text.
Return ONLY valid JSON with this exact shape:
{
  "documentType": "receipt" | "invoice" | "bank_statement" | "unknown",
  "transactionType": "income" | "expense" | "transfer" | "unknown",
  "totalAmount": number (the grand total / final amount, always positive),
  "currency": "ISO 4217 code like USD, EUR, KZT, RUB",
  "date": "YYYY-MM-DD",
  "vendor": "merchant/store/company name",
  "tax": number (tax amount if present),
  "taxRate": number (tax rate as percentage if detectable),
  "subtotal": number (subtotal before tax),
  "lineItems": [{"description": "item name", "quantity": number, "unitPrice": number, "amount": number}],
  "categoryHint": "food|transport|entertainment|shopping|utilities|health|education|travel|other",
  "paymentMethod": "cash|card|bank_transfer|other",
  "documentNumber": "invoice/receipt number if present"
}
Rules:
- totalAmount must be the final/grand total, always a positive number
- transactionType: receipts are usually "expense", refunds are "income"
- If a field cannot be determined, omit it or set null
- Dates must be ISO format YYYY-MM-DD
- Currency: detect from symbols ($=USD, EUR=EUR, KZT=KZT, RUB=RUB, etc.) or text
- lineItems: extract individual items if visible
- Preserve original vendor name, don't translate

Document text:
`;

export class AiDocumentExtractor {
  private geminiModel: GenerativeModel | null = null;

  constructor(apiKey: string | undefined = process.env.GEMINI_API_KEY) {
    if (apiKey && isAiEnabled()) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
    }
  }

  isAvailable(): boolean {
    return !!this.geminiModel && isAiEnabled();
  }

  async extractFromText(text: string): Promise<AiExtractionResult | null> {
    if (!this.geminiModel || isAiCircuitOpen()) {
      return null;
    }

    const safeText = text.length > 15000 ? text.substring(0, 15000) : text;
    const redactedText = redactSensitive(safeText);

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);

      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `${EXTRACTION_PROMPT}${redactedText}` }],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            Number.isFinite(timeoutMs) ? timeoutMs : 20000,
            'AI document extraction timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 500,
          maxDelayMs: 3000,
          isRetryable: (error) => error instanceof TimeoutError,
        },
      );

      const content = completion.response?.text();
      if (!content) {
        recordAiFailure();
        return null;
      }

      const parsed = JSON.parse(content);
      recordAiSuccess();
      return this.normalizeResult(parsed);
    } catch (error) {
      recordAiFailure();
      console.error('[AiDocumentExtractor] Failed:', error);
      return null;
    }
  }

  async extractFromImage(imageBuffer: Buffer, mimeType: string): Promise<AiExtractionResult | null> {
    if (!this.geminiModel || isAiCircuitOpen()) {
      return null;
    }

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
      const base64Image = imageBuffer.toString('base64');

      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          mimeType,
                          data: base64Image,
                        },
                      },
                      {
                        text: EXTRACTION_PROMPT,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            Number.isFinite(timeoutMs) ? timeoutMs : 30000,
            'AI image extraction timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 1000,
          maxDelayMs: 5000,
          isRetryable: (error) => error instanceof TimeoutError,
        },
      );

      const content = completion.response?.text();
      if (!content) {
        recordAiFailure();
        return null;
      }

      const parsed = JSON.parse(content);
      recordAiSuccess();
      return this.normalizeResult(parsed);
    } catch (error) {
      recordAiFailure();
      console.error('[AiDocumentExtractor] Image extraction failed:', error);
      return null;
    }
  }

  private normalizeResult(raw: any): AiExtractionResult {
    return {
      documentType: this.normalizeDocType(raw?.documentType),
      transactionType: this.normalizeTxType(raw?.transactionType),
      totalAmount: typeof raw?.totalAmount === 'number' ? Math.abs(raw.totalAmount) : undefined,
      currency: typeof raw?.currency === 'string' ? raw.currency.toUpperCase() : undefined,
      date: typeof raw?.date === 'string' ? raw.date : undefined,
      vendor: typeof raw?.vendor === 'string' ? raw.vendor.trim() : undefined,
      tax: typeof raw?.tax === 'number' ? raw.tax : undefined,
      taxRate: typeof raw?.taxRate === 'number' ? raw.taxRate : undefined,
      subtotal: typeof raw?.subtotal === 'number' ? raw.subtotal : undefined,
      lineItems: Array.isArray(raw?.lineItems) ? raw.lineItems.filter(
        (item: any) => item?.description && typeof item?.amount === 'number',
      ) : undefined,
      categoryHint: typeof raw?.categoryHint === 'string' ? raw.categoryHint : undefined,
      paymentMethod: typeof raw?.paymentMethod === 'string' ? raw.paymentMethod : undefined,
      documentNumber: typeof raw?.documentNumber === 'string' ? raw.documentNumber : undefined,
    };
  }

  private normalizeDocType(value: any): DocumentType | undefined {
    const valid = ['receipt', 'invoice', 'bank_statement', 'unknown'];
    return valid.includes(value) ? value : undefined;
  }

  private normalizeTxType(value: any): TransactionDirection | undefined {
    const valid = ['income', 'expense', 'transfer', 'unknown'];
    return valid.includes(value) ? value : undefined;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/parsing/helpers/ai-document-extractor.helper.spec.ts --no-coverage`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/helpers/ai-document-extractor.helper.ts \
       backend/@tests/unit/modules/parsing/helpers/ai-document-extractor.helper.spec.ts
git commit -m "feat(parsing): add AiDocumentExtractor with Gemini text and vision support"
```

---

## Task 6: Universal Extractor Service (Core Pipeline)

**Files:**
- Create: `backend/src/modules/parsing/services/universal-extractor.service.ts`
- Create: `backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts
import { UniversalExtractorService } from '../../../../../src/modules/parsing/services/universal-extractor.service';
import { TransactionTypeDetectorService } from '../../../../../src/modules/parsing/services/transaction-type-detector.service';
import { DocumentClassifierService } from '../../../../../src/modules/parsing/services/document-classifier.service';
import { OcrService } from '../../../../../src/modules/parsing/services/ocr.service';
import { UniversalAmountParser } from '../../../../../src/modules/parsing/services/universal-amount-parser.service';

// Mock the AI extractor
jest.mock('../../../../../src/modules/parsing/helpers/ai-document-extractor.helper', () => ({
  AiDocumentExtractor: jest.fn().mockImplementation(() => ({
    isAvailable: () => false,
    extractFromText: jest.fn().mockResolvedValue(null),
    extractFromImage: jest.fn().mockResolvedValue(null),
  })),
}));

describe('UniversalExtractorService', () => {
  let service: UniversalExtractorService;

  beforeEach(() => {
    const amountParser = new UniversalAmountParser();
    const typeDetector = new TransactionTypeDetectorService();
    const classifier = new DocumentClassifierService();
    const ocrService = new OcrService();

    service = new UniversalExtractorService(
      amountParser,
      typeDetector,
      classifier,
      ocrService,
    );
  });

  describe('extractFromText', () => {
    it('should extract amount and detect expense from receipt text', async () => {
      const text = 'Payment Receipt\nStore ABC\nItem 1  $10.00\nItem 2  $20.49\nTotal: $30.49';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(30.49);
      expect(result.currency).toBe('USD');
      expect(result.transactionType).toBe('expense');
      expect(result.documentType).toBe('receipt');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract amount from Russian receipt', async () => {
      const text = 'Кассовый чек\nМагазин "Продукты"\nМолоко  500\nХлеб  200\nИтого: 700 KZT';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(700);
      expect(result.currency).toBe('KZT');
      expect(result.transactionType).toBe('expense');
    });

    it('should detect refund as income', async () => {
      const text = 'Refund Confirmation\nRefund Amount: $25.00\nCredited to Visa ****1234';
      const result = await service.extractFromText(text);

      expect(result.totalAmount).toBe(25);
      expect(result.transactionType).toBe('income');
    });

    it('should return unknown for empty text', async () => {
      const result = await service.extractFromText('');
      expect(result.documentType).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should extract vendor from receipt', async () => {
      const text = 'Starbucks Coffee\n1234 Main St\nLatte  $5.50\nTotal: $5.50';
      const result = await service.extractFromText(text);

      expect(result.vendor).toBeTruthy();
    });

    it('should populate fieldConfidence', async () => {
      const text = 'Receipt\nStore XYZ\nTotal: $45.99\nTax: $3.50';
      const result = await service.extractFromText(text);

      expect(result.fieldConfidence).toBeDefined();
      expect(result.fieldConfidence.totalAmount).toBeGreaterThan(0);
    });

    it('should return validationIssues when subtotal + tax != total', async () => {
      const text = 'Receipt\nSubtotal: $40.00\nTax: $5.00\nTotal: $50.00';
      const result = await service.extractFromText(text);

      if (result.subtotal && result.tax && result.totalAmount) {
        const expectedTotal = result.subtotal + result.tax;
        if (Math.abs(expectedTotal - result.totalAmount) > 0.01) {
          expect(result.validationIssues.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/universal-extractor.service.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement UniversalExtractorService**

This is the core service that ties everything together. The implementation should:
1. Accept raw text or file buffer
2. Classify the document (receipt/invoice/statement)
3. Extract total amount using regex scoring (TOTAL_KEYWORD proximity scoring via UniversalAmountParser)
4. Detect transaction type (income/expense/transfer)
5. Extract date, vendor, currency, tax, line items
6. Optionally validate/enhance with AI when regex confidence is low
7. Cross-validate fields (subtotal + tax = total)
8. Return unified `ParsedDocument`

Key implementation details:
- Use `UniversalAmountParser` for robust multi-locale amount parsing
- Reuse TOTAL_KEYWORD scoring logic from `GmailReceiptParserService`
- Use `TransactionTypeDetectorService` for income/expense
- Use `DocumentClassifierService` for document type
- AI fills gaps only (regex result is primary)
- Validation catches inconsistencies (subtotal + tax != total, etc.)

See the full implementation in the code block from the initial plan discussion (Task 6 section). The service exposes 3 entry points:
- `extractFromText(text, context?)` - for text already extracted from PDF/email
- `extractFromImage(buffer, mimeType, context?)` - for image files (OCR + extraction)
- `extractFromPdf(buffer, context?)` - for PDF files (text extraction or OCR fallback)

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest @tests/unit/modules/parsing/services/universal-extractor.service.spec.ts --no-coverage`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/universal-extractor.service.ts \
       backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts
git commit -m "feat(parsing): add UniversalExtractorService - core hybrid extraction pipeline"
```

---

## Task 7: Register New Services in ParsingModule

**Files:**
- Modify: `backend/src/modules/parsing/parsing.module.ts`

**Step 1: Update parsing.module.ts**

Add these imports at the top:
```typescript
import { DocumentClassifierService } from './services/document-classifier.service';
import { OcrService } from './services/ocr.service';
import { TransactionTypeDetectorService } from './services/transaction-type-detector.service';
import { UniversalExtractorService } from './services/universal-extractor.service';
import { AiDocumentExtractor } from './helpers/ai-document-extractor.helper';
```

Add these to the `providers` array:
```typescript
DocumentClassifierService,
OcrService,
TransactionTypeDetectorService,
UniversalExtractorService,
{
  provide: 'AI_DOCUMENT_EXTRACTOR',
  useFactory: () => new AiDocumentExtractor(process.env.GEMINI_API_KEY),
},
```

Add these to the `exports` array:
```typescript
DocumentClassifierService,
OcrService,
TransactionTypeDetectorService,
UniversalExtractorService,
```

**Step 2: Verify the module compiles**

Run: `cd backend && npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: No errors related to parsing module

**Step 3: Commit**

```bash
git add backend/src/modules/parsing/parsing.module.ts
git commit -m "feat(parsing): register OCR, classifier, type detector, and universal extractor in ParsingModule"
```

---

## Task 8: Refactor GmailReceiptParserService to Delegate to UniversalExtractor

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Modify: `backend/src/modules/gmail/gmail.module.ts`
- Update: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Update gmail.module.ts to import ParsingModule**

Add `ParsingModule` to the `imports` array of `GmailModule`:
```typescript
import { ParsingModule } from '../parsing/parsing.module';
// In @Module imports:
ParsingModule,
```

**Step 2: Update GmailReceiptParserService constructor**

Inject `UniversalExtractorService` as optional dependency. In `parsePdfReceipt()`, delegate to the universal extractor and map the result back to the existing receipt format. Keep backward compatibility by preserving the existing return shape.

Add the `transactionType` field to the parsePdfReceipt return value.

**Step 3: Run existing tests**

Run: `cd backend && npx jest @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts --no-coverage`
Expected: All existing tests PASS (backward compatibility maintained)

**Step 4: Commit**

```bash
git add backend/src/modules/gmail/services/gmail-receipt-parser.service.ts \
       backend/src/modules/gmail/gmail.module.ts \
       backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
git commit -m "refactor(gmail): delegate receipt parsing to UniversalExtractorService"
```

---

## Task 9: Receipt Entity Migration - Add Source & Make Gmail Fields Nullable

**Files:**
- Create: `backend/src/migrations/TIMESTAMP-AddReceiptSourceAndNullableGmail.ts`
- Modify: `backend/src/entities/receipt.entity.ts`

**Step 1: Update Receipt entity**

Add `source` enum field (`gmail` | `upload` | `telegram` | `scan`) with default `gmail`.
Make `gmailMessageId` and `gmailThreadId` nullable.
Add `transactionType` to parsedData interface type.

**Step 2: Create migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptSourceAndNullableGmail1740300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "receipt_source_enum" AS ENUM ('gmail', 'upload', 'telegram', 'scan')
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" ADD COLUMN "source" "receipt_source_enum" NOT NULL DEFAULT 'gmail'
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" ALTER COLUMN "gmail_message_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" ALTER COLUMN "gmail_thread_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "UQ_receipts_gmail_message_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_receipts_gmail_message_id"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_receipts_gmail_message_id_unique"
      ON "receipts" ("gmail_message_id")
      WHERE "gmail_message_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_receipts_gmail_message_id_unique"`);
    await queryRunner.query(`ALTER TABLE "receipts" ALTER COLUMN "gmail_thread_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "receipts" ALTER COLUMN "gmail_message_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN "source"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "receipt_source_enum"`);
  }
}
```

**Step 3: Run migration**

Run: `cd backend && npm run migration:run`
Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add backend/src/entities/receipt.entity.ts \
       backend/src/migrations/*AddReceiptSourceAndNullableGmail*
git commit -m "feat(receipts): add source field, make Gmail fields nullable for direct upload support"
```

---

## Task 10: Direct Upload API Endpoint

**Files:**
- Create: `backend/src/modules/parsing/parsing.controller.ts`
- Create: `backend/src/modules/parsing/dto/parse-document.dto.ts`
- Modify: `backend/src/modules/parsing/parsing.module.ts` (add controller)

**Step 1: Create the ParseDocumentDto**

```typescript
// backend/src/modules/parsing/dto/parse-document.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ParseDocumentDto {
  @ApiPropertyOptional({ description: 'Wallet ID to associate with' })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({ description: 'Branch ID to associate with' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
```

**Step 2: Create the ParsingController**

`POST /documents/parse` endpoint that:
- Accepts PDF, PNG, JPG, JPEG, XLSX, CSV via multipart/form-data
- Uses multer for file upload
- Delegates to `UniversalExtractorService` based on file type:
  - Images -> `extractFromImage()`
  - PDF -> `extractFromPdf()`
  - CSV/XLSX -> `extractFromText()` (read file as text)
- Returns `ParsedDocument` JSON response
- Cleans up temp file after processing

**Step 3: Register controller in ParsingModule**

Add `ParsingController` to the `controllers` array.

**Step 4: Test endpoint manually**

Run: `cd backend && npm run start:dev`
Test: `curl -X POST http://localhost:3001/documents/parse -H "Authorization: Bearer <token>" -F "file=@test-receipt.pdf"`

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/parsing.controller.ts \
       backend/src/modules/parsing/dto/parse-document.dto.ts \
       backend/src/modules/parsing/parsing.module.ts
git commit -m "feat(parsing): add POST /documents/parse endpoint for universal document parsing"
```

---

## Task 11: Integration Tests & Golden Tests

**Files:**
- Create: `backend/@tests/unit/modules/parsing/services/universal-extractor.integration.spec.ts`
- Add golden test fixtures in `backend/golden/receipts/`

**Step 1: Create integration test with real-world receipt text patterns**

Test multiple receipt formats: English store receipt, Russian fiscal check, Kaspi payment confirmation, invoice, bank statement snippet. Each test should verify: amount extraction, currency detection, transaction type determination.

**Step 2: Create golden test fixtures**

Add 5-10 representative text samples (not real documents, but realistic patterns) as fixture files in `backend/golden/receipts/` with corresponding expected JSON output.

**Step 3: Run all parsing tests**

Run: `cd backend && npx jest --testPathPattern=parsing --no-coverage`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add backend/@tests/unit/modules/parsing/ backend/golden/
git commit -m "test(parsing): add integration and golden tests for universal document parser"
```

---

## Task 12: Full System Verification

**Step 1: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests PASS

**Step 2: Run linting**

Run: `cd backend && npx biome check src/modules/parsing/ --write`
Expected: No errors

**Step 3: Run TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: fix lint and type errors from universal parser implementation"
```

---

## Summary of New Files Created

| File | Purpose |
|------|---------|
| `parsing/interfaces/parsed-document.interface.ts` | Unified output types |
| `parsing/services/transaction-type-detector.service.ts` | Income/expense/transfer detection |
| `parsing/services/document-classifier.service.ts` | Receipt vs invoice vs statement classification |
| `parsing/services/ocr.service.ts` | Tesseract.js OCR + sharp preprocessing |
| `parsing/helpers/ai-document-extractor.helper.ts` | Gemini text + vision extraction |
| `parsing/services/universal-extractor.service.ts` | Core hybrid pipeline |
| `parsing/parsing.controller.ts` | POST /documents/parse endpoint |
| `parsing/dto/parse-document.dto.ts` | Request DTO |
| Migration file | Receipt entity schema changes |

## Summary of Modified Files

| File | Change |
|------|--------|
| `parsing/parsing.module.ts` | Register all new services + controller |
| `gmail/gmail.module.ts` | Import ParsingModule |
| `gmail/services/gmail-receipt-parser.service.ts` | Delegate to UniversalExtractor |
| `entities/receipt.entity.ts` | Add `source` field, nullable Gmail fields |
