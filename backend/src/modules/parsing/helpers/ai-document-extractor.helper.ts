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
}

const EXTRACTION_PROMPT = `You are a financial document parser. Extract all available data from this document and return ONLY JSON.

Output format:
{
  "documentType": "receipt" | "invoice" | "bank_statement" | "unknown",
  "transactionType": "income" | "expense" | "transfer" | "unknown",
  "totalAmount": number,
  "currency": "ISO-4217",
  "date": "YYYY-MM-DD",
  "vendor": "name",
  "tax": number,
  "taxRate": number,
  "subtotal": number,
  "lineItems": [{"description": "", "quantity": number, "unitPrice": number, "amount": number}],
  "categoryHint": "food|transport|entertainment|shopping|utilities|health|education|travel|other",
  "paymentMethod": "cash|card|bank_transfer|other",
  "documentNumber": "string"
}

Rules:
- totalAmount is the final/grand total and must be positive.
- transactionType for receipts is usually expense, but refund/return should be income.
- If a field is missing, omit it.
- Preserve vendor name exactly as in source.
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
    return Boolean(this.geminiModel) && isAiEnabled() && !isAiCircuitOpen();
  }

  async extractFromText(text: string): Promise<AiExtractionResult | null> {
    if (!this.geminiModel || !this.isAvailable()) {
      return null;
    }

    const payload = `${EXTRACTION_PROMPT}\n\nDocument text:\n${redactSensitive(text).slice(0, 15000)}`;
    return this.callModel([
      {
        role: 'user',
        parts: [{ text: payload }],
      },
    ]);
  }

  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<AiExtractionResult | null> {
    if (!this.geminiModel || !this.isAvailable()) {
      return null;
    }

    return this.callModel([
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBuffer.toString('base64'),
            },
          },
          {
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ]);
  }

  private async callModel(contents: any[]): Promise<AiExtractionResult | null> {
    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);

      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents,
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
          maxDelayMs: 5000,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      const content = completion?.response?.text();
      if (!content) {
        recordAiFailure();
        return null;
      }

      const parsed = JSON.parse(this.unwrapJson(content));
      const normalized = this.normalizeResult(parsed);
      recordAiSuccess();
      return normalized;
    } catch (error) {
      recordAiFailure();
      console.error('[AiDocumentExtractor] Failed:', error);
      return null;
    }
  }

  private normalizeResult(raw: any): AiExtractionResult {
    return {
      documentType: this.normalizeDocumentType(raw?.documentType),
      transactionType: this.normalizeTransactionType(raw?.transactionType),
      totalAmount: typeof raw?.totalAmount === 'number' ? Math.abs(raw.totalAmount) : undefined,
      currency: typeof raw?.currency === 'string' ? raw.currency.toUpperCase() : undefined,
      date: typeof raw?.date === 'string' ? raw.date : undefined,
      vendor: typeof raw?.vendor === 'string' ? raw.vendor.trim() : undefined,
      tax: typeof raw?.tax === 'number' ? raw.tax : undefined,
      taxRate: typeof raw?.taxRate === 'number' ? raw.taxRate : undefined,
      subtotal: typeof raw?.subtotal === 'number' ? raw.subtotal : undefined,
      lineItems: Array.isArray(raw?.lineItems)
        ? raw.lineItems.filter((item: any) => item?.description && typeof item?.amount === 'number')
        : undefined,
      categoryHint: typeof raw?.categoryHint === 'string' ? raw.categoryHint : undefined,
      paymentMethod: typeof raw?.paymentMethod === 'string' ? raw.paymentMethod : undefined,
      documentNumber: typeof raw?.documentNumber === 'string' ? raw.documentNumber : undefined,
    };
  }

  private normalizeDocumentType(value: string | undefined): DocumentType | undefined {
    if (
      value === 'receipt' ||
      value === 'invoice' ||
      value === 'bank_statement' ||
      value === 'unknown'
    ) {
      return value;
    }
    return undefined;
  }

  private normalizeTransactionType(value: string | undefined): TransactionDirection | undefined {
    if (value === 'income' || value === 'expense' || value === 'transfer' || value === 'unknown') {
      return value;
    }
    return undefined;
  }

  private unwrapJson(content: string): string {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
}
