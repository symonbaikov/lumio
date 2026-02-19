import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { TimeoutError, retry, withTimeout } from '../../../common/utils/async.util';
import {
  isAiCircuitOpen,
  isAiEnabled,
  recordAiFailure,
  recordAiSuccess,
  redactSensitive,
  withAiConcurrency,
} from '../../parsing/helpers/ai-runtime.util';

export type MerchantExtractionInput = {
  pdfText?: string | null;
  emailBody?: string | null;
  sender?: string | null;
  subject?: string | null;
  dateHeader?: string | null;
};

export type MerchantExtractionResult = {
  merchant: string;
  confidence: number;
};

const MIN_MERCHANT_CONFIDENCE = 0.3;

const DATE_LIKE_PATTERN =
  /^(date\s*)?\d{4}[-/.]\d{2}[-/.]\d{2}|^\d{2}[-/.]\d{2}[-/.]\d{4}|\d{1,2}:\d{2}\s*(am|pm)\s*(pst|est|utc|gmt|cst|mst)?$/i;

const JUNK_VENDOR_PATTERN =
  /^(page\s+\d+(\s+of\s+\d+)?|receipt|invoice|order|payment|confirmation|date|unknown|n\/a|na|\d+)$/i;

export class AiMerchantExtractor {
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

  async extractMerchant(input: MerchantExtractionInput): Promise<MerchantExtractionResult | null> {
    if (!this.geminiModel || !this.isAvailable()) {
      return null;
    }

    const prompt = this.buildPrompt(input);

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '15000', 10);

      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: prompt }],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            Number.isFinite(timeoutMs) ? timeoutMs : 15000,
            'AI merchant extraction timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      const content = completion?.response?.text();
      if (!content) {
        recordAiFailure();
        return null;
      }

      const result = this.parseResponse(content);

      if (result) {
        recordAiSuccess();
      } else {
        recordAiFailure();
      }

      return result;
    } catch (error) {
      recordAiFailure();
      console.error('[AiMerchantExtractor] Failed:', error);
      return null;
    }
  }

  private buildPrompt(input: MerchantExtractionInput): string {
    const blocks: string[] = [];

    if (input.sender) {
      blocks.push(`Email sender (From header): ${redactSensitive(input.sender)}`);
    }

    if (input.subject) {
      blocks.push(
        `Email subject: ${redactSensitive(input.subject)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500)}`,
      );
    }

    if (input.dateHeader) {
      blocks.push(`Email date: ${input.dateHeader}`);
    }

    if (input.emailBody) {
      blocks.push(
        `Email body (first 3000 chars):\n${redactSensitive(this.stripHtml(input.emailBody)).slice(0, 3000)}`,
      );
    }

    if (input.pdfText) {
      blocks.push(`PDF attachment text (first 5000 chars):\n${redactSensitive(input.pdfText).slice(0, 5000)}`);
    }

    return `You are a financial document analyst. Extract the merchant/vendor/company name from this receipt email.

Return ONLY JSON with shape {"merchant": "CompanyName", "confidence": 0.95}.

Rules:
- "merchant" is the company/brand that charged the customer (for example: "GitHub", "Amazon", "Spotify").
- Return short brand name, not legal suffixes.
- Do NOT return dates, email addresses, amounts, or generic words like "Receipt"/"Invoice".
- If uncertain, return {"merchant": "", "confidence": 0}.
- confidence must be a number in [0, 1].

${blocks.join('\n\n')}`;
  }

  private parseResponse(content: string): MerchantExtractionResult | null {
    try {
      const parsed = JSON.parse(this.unwrapJson(content));
      const merchant = String(parsed?.merchant || '').trim();
      const confidence = Number(parsed?.confidence);

      if (!merchant || merchant.length > 100) {
        return null;
      }

      if (!Number.isFinite(confidence) || confidence < MIN_MERCHANT_CONFIDENCE) {
        return null;
      }

      if (DATE_LIKE_PATTERN.test(merchant)) {
        return null;
      }

      if (JUNK_VENDOR_PATTERN.test(merchant)) {
        return null;
      }

      return {
        merchant,
        confidence,
      };
    } catch {
      return null;
    }
  }

  private unwrapJson(content: string): string {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
