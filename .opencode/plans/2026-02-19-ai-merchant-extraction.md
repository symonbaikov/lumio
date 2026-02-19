# AI-Powered Merchant Extraction for Gmail Receipts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Заменить ненадёжный rule-based парсинг vendor-поля на AI-first систему определения мерчанта через Gemini, с использованием всех доступных источников данных (PDF текст, HTML body email, email headers), плюс ретроактивный перепарсинг существующих чеков.

**Architecture:** Создаём новый `AiMerchantExtractor` helper по шаблону существующих AI helpers (`AiTransactionExtractor`, `AiCategoryClassifier`). Он принимает все данные о чеке (PDF текст, email body, sender, subject, date header) и через Gemini определяет merchant name. Интегрируем в `GmailReceiptProcessor` pipeline: сначала AI, fallback на улучшенный rule-based. Фронтенд `resolveGmailMerchantLabel` усиливаем фильтром дат и мусорных строк. Добавляем endpoint для ретроактивного перепарсинга.

**Tech Stack:** Gemini 2.5 Flash (`@google/generative-ai`), NestJS, TypeScript, existing `ai-runtime.util.ts` (circuit breaker, concurrency, PII redaction)

---

## Контекст проблемы

В поле MERCHANT часто отображается мусор вместо реального бренда:
- `Date2026-02-16 10:57AM PST` — дата из email попала в vendor
- `Page 1 of 1` — служебный текст PDF
- Длинные предложения типа `We received payment for your sponsorship...`

**Причина:** `extractVendor()` в `gmail-receipt-parser.service.ts:213-243` берёт первую короткую строку из PDF текста как vendor. Для многих чеков (особенно без PDF — только email body) это даёт мусорный результат. Парсинг email body (HTML/text) не реализован совсем.

**Решение:** AI-first подход — отправляем Gemini все доступные данные об email и получаем структурированный ответ с merchant name.

---

## Task 1: Создать `AiMerchantExtractor` helper

**Files:**
- Create: `backend/src/modules/gmail/helpers/ai-merchant-extractor.helper.ts`
- Test: `backend/@tests/unit/modules/gmail/ai-merchant-extractor.helper.spec.ts`

**Step 1: Написать failing test**

```typescript
// backend/@tests/unit/modules/gmail/ai-merchant-extractor.helper.spec.ts
import { AiMerchantExtractor } from '../../../../src/modules/gmail/helpers/ai-merchant-extractor.helper';

describe('AiMerchantExtractor', () => {
  describe('isAvailable', () => {
    it('returns false when no API key is provided', () => {
      const extractor = new AiMerchantExtractor(undefined);
      expect(extractor.isAvailable()).toBe(false);
    });
  });

  describe('buildPrompt', () => {
    it('includes all provided fields in the prompt', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const prompt = (extractor as any).buildPrompt({
        pdfText: 'GitHub Inc\nReceipt #1234',
        emailBody: '<p>Thank you for your payment to GitHub</p>',
        sender: 'GitHub <noreply@github.com>',
        subject: '[GitHub] Payment receipt for January 2026',
        dateHeader: '2026-01-15',
      });

      expect(prompt).toContain('GitHub');
      expect(prompt).toContain('noreply@github.com');
      expect(prompt).toContain('Payment receipt');
    });

    it('handles missing optional fields gracefully', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const prompt = (extractor as any).buildPrompt({
        sender: 'billing@example.com',
        subject: 'Your receipt',
      });

      expect(prompt).toContain('billing@example.com');
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('null');
    });
  });

  describe('parseResponse', () => {
    it('extracts merchant from valid JSON response', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"GitHub","confidence":0.95}');

      expect(result).toEqual({ merchant: 'GitHub', confidence: 0.95 });
    });

    it('returns null for empty merchant', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"","confidence":0.5}');

      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('not json');

      expect(result).toBeNull();
    });

    it('rejects date-like merchant values', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse(
        '{"merchant":"Date2026-02-16 10:57AM PST","confidence":0.3}',
      );

      expect(result).toBeNull();
    });

    it('rejects low confidence results', () => {
      const extractor = new AiMerchantExtractor(undefined);
      const result = (extractor as any).parseResponse('{"merchant":"GitHub","confidence":0.1}');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Запустить тест, убедиться что он падает**

Run: `cd backend && npx jest --testPathPattern="ai-merchant-extractor" --no-coverage`
Expected: FAIL — module not found

**Step 3: Реализовать `AiMerchantExtractor`**

```typescript
// backend/src/modules/gmail/helpers/ai-merchant-extractor.helper.ts
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

const DATE_LIKE_PATTERN =
  /^(date\s*)?\d{4}[-/.]\d{2}[-/.]\d{2}|^\d{2}[-/.]\d{2}[-/.]\d{4}|\d{1,2}:\d{2}\s*(am|pm)\s*(pst|est|utc|gmt|cst|mst)/i;

const JUNK_VENDOR_PATTERN =
  /^(page\s+\d+|receipt|invoice|order|payment|confirmation|date|unknown|n\/a|\d+)$/i;

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
    return !!this.geminiModel && isAiEnabled() && !isAiCircuitOpen();
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
    const parts: string[] = [];

    if (input.sender) {
      parts.push(`Email sender (From header): ${redactSensitive(input.sender)}`);
    }
    if (input.subject) {
      parts.push(`Email subject: ${redactSensitive(input.subject).slice(0, 500)}`);
    }
    if (input.dateHeader) {
      parts.push(`Email date: ${input.dateHeader}`);
    }
    if (input.emailBody) {
      const sanitized = this.stripHtml(input.emailBody);
      parts.push(`Email body (first 3000 chars):\n${redactSensitive(sanitized).slice(0, 3000)}`);
    }
    if (input.pdfText) {
      parts.push(
        `PDF attachment text (first 5000 chars):\n${redactSensitive(input.pdfText).slice(0, 5000)}`,
      );
    }

    return `You are a financial document analyst. Extract the merchant/vendor/company name from this receipt email.

Return ONLY JSON: {"merchant": "CompanyName", "confidence": 0.95}

Rules:
- "merchant" is the company/brand that charged the customer (e.g., "GitHub", "Amazon", "Netflix", "Spotify").
- Return the SHORT brand name, not a legal entity (e.g., "GitHub" not "GitHub, Inc.").
- Do NOT return dates, email addresses, amounts, or generic words like "Receipt" or "Invoice".
- Do NOT return the email sender's address — extract the brand/company name.
- If you cannot determine the merchant with reasonable confidence, return {"merchant": "", "confidence": 0}.
- confidence must be 0.0 to 1.0.

${parts.join('\n\n')}`;
  }

  private parseResponse(content: string): MerchantExtractionResult | null {
    try {
      const parsed = JSON.parse(content);
      const merchant = String(parsed?.merchant || '').trim();
      const confidence = Number(parsed?.confidence);

      if (!merchant || merchant.length > 100) {
        return null;
      }

      if (!Number.isFinite(confidence) || confidence < 0.3) {
        return null;
      }

      // Reject date-like values
      if (DATE_LIKE_PATTERN.test(merchant)) {
        return null;
      }

      // Reject junk values
      if (JUNK_VENDOR_PATTERN.test(merchant)) {
        return null;
      }

      return { merchant, confidence };
    } catch {
      return null;
    }
  }

  private stripHtml(html: string): string {
    return html
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
```

**Step 4: Запустить тесты, убедиться что проходят**

Run: `cd backend && npx jest --testPathPattern="ai-merchant-extractor" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/gmail/helpers/ai-merchant-extractor.helper.ts backend/@tests/unit/modules/gmail/ai-merchant-extractor.helper.spec.ts
git commit -m "feat(gmail): add AI merchant extractor helper using Gemini"
```

---

## Task 2: Добавить извлечение email body в `GmailReceiptProcessor`

**Files:**
- Modify: `backend/src/modules/gmail/gmail-receipt-processor.ts:101-325`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-processor.spec.ts`

**Step 1: Написать failing test**

Add to existing `gmail-receipt-processor.spec.ts`:

```typescript
describe('extractEmailBody', () => {
  it('extracts plain text body from gmail message payload', () => {
    const processor = /* instantiate with mocks */;
    const payload = {
      mimeType: 'multipart/alternative',
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: Buffer.from('Thank you for your GitHub purchase').toString('base64url') },
        },
        {
          mimeType: 'text/html',
          body: { data: Buffer.from('<p>Thank you for your GitHub purchase</p>').toString('base64url') },
        },
      ],
    };

    const body = (processor as any).extractEmailBody(payload);
    expect(body).toContain('GitHub');
  });

  it('returns null when no text body parts exist', () => {
    const processor = /* instantiate with mocks */;
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'application/pdf', body: { attachmentId: 'abc' }, filename: 'receipt.pdf' },
      ],
    };

    const body = (processor as any).extractEmailBody(payload);
    expect(body).toBeNull();
  });
});
```

**Step 2: Запустить тест, убедиться что он падает**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-processor" --no-coverage`
Expected: FAIL — `extractEmailBody` is not a function

**Step 3: Добавить метод `extractEmailBody` в `GmailReceiptProcessor`**

In `gmail-receipt-processor.ts`, add private method:

```typescript
/**
 * Extracts text or HTML body from a Gmail message payload.
 * Prefers text/html (richer context for AI), falls back to text/plain.
 */
private extractEmailBody(payload: any): string | null {
  const bodies: { mimeType: string; data: string }[] = [];

  const walk = (part: any) => {
    if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
      bodies.push({ mimeType: part.mimeType, data: part.body.data });
    }
    if (part.parts) {
      for (const child of part.parts) {
        walk(child);
      }
    }
  };

  walk(payload);

  // Prefer text/html (more structure for AI), fallback to text/plain
  const htmlPart = bodies.find(b => b.mimeType === 'text/html');
  const textPart = bodies.find(b => b.mimeType === 'text/plain');
  const chosen = htmlPart || textPart;

  if (!chosen) {
    return null;
  }

  try {
    return Buffer.from(chosen.data, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}
```

**Step 4: In `processJob()`, extract email body and pass to parser**

In `processJob()` (~line 137), after extracting headers, add:

```typescript
const emailBody = this.extractEmailBody(message.payload);
```

Change the parser call (~line 180) to pass full context:

```typescript
parsedData = await this.parserService.parseReceipt(attachmentPaths[0], {
  sender,
  subject,
  dateHeader,
  emailBody,
});
```

Add handling for receipts without PDF attachments (~after line 202):

```typescript
if (attachmentPaths.length === 0 && emailBody) {
  try {
    parsedData = await this.parserService.parseFromEmailOnly({
      sender,
      subject,
      dateHeader,
      emailBody,
    });
    if (parsedData) {
      initialStatus = this.hasParsedAmount(parsedData.amount)
        ? ReceiptStatus.PARSED
        : ReceiptStatus.NEEDS_REVIEW;
    }
  } catch (error) {
    this.logger.error('Failed to parse receipt from email body', error);
    initialStatus = ReceiptStatus.NEEDS_REVIEW;
  }
}
```

**Step 5: Запустить тесты**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-processor" --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/modules/gmail/gmail-receipt-processor.ts
git commit -m "feat(gmail): extract email body for AI merchant analysis"
```

---

## Task 3: Интегрировать AI в `GmailReceiptParserService`

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Modify: `backend/src/modules/gmail/gmail.module.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Написать failing тесты**

Add to `gmail-receipt-parser.service.spec.ts`:

```typescript
describe('AI-powered merchant extraction', () => {
  it('uses AI result when available and high confidence', async () => {
    const mockAi = {
      isAvailable: () => true,
      extractMerchant: jest.fn().mockResolvedValue({ merchant: 'GitHub', confidence: 0.95 }),
    };
    const aiService = new GmailReceiptParserService(new UniversalAmountParser(), mockAi as any);

    // Access private method for unit testing the AI integration path
    const vendor = await (aiService as any).extractVendorWithAi(
      'Some random PDF text\nDate2026-02-16',
      { sender: 'noreply@github.com', subject: 'Receipt', emailBody: null },
    );
    expect(vendor).toBe('GitHub');
  });

  it('falls back to rule-based when AI returns null', async () => {
    const mockAi = {
      isAvailable: () => true,
      extractMerchant: jest.fn().mockResolvedValue(null),
    };
    const aiService = new GmailReceiptParserService(new UniversalAmountParser(), mockAi as any);

    const vendor = await (aiService as any).extractVendorWithAi(
      'Spotify\nReceipt for your subscription',
      { sender: 'no-reply@spotify.com', subject: 'Receipt' },
    );
    expect(vendor).toBe('Spotify');
  });

  it('falls back to rule-based when AI is unavailable', async () => {
    const mockAi = {
      isAvailable: () => false,
      extractMerchant: jest.fn(),
    };
    const aiService = new GmailReceiptParserService(new UniversalAmountParser(), mockAi as any);

    const vendor = await (aiService as any).extractVendorWithAi(
      'Netflix\nMonthly subscription',
      { sender: 'info@netflix.com' },
    );
    expect(vendor).toBe('Netflix');
    expect(mockAi.extractMerchant).not.toHaveBeenCalled();
  });
});
```

**Step 2: Запустить тесты, убедиться что падают**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-parser.service" --no-coverage`

**Step 3: Модифицировать `GmailReceiptParserService`**

3a. Add imports and update constructor:

```typescript
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AiMerchantExtractor } from '../helpers/ai-merchant-extractor.helper';

// New type for parser context
type ReceiptParseContext = {
  sender?: string;
  subject?: string;
  dateHeader?: string;
  emailBody?: string | null;
};

@Injectable()
export class GmailReceiptParserService {
  private readonly logger = new Logger(GmailReceiptParserService.name);

  constructor(
    private readonly amountParser: UniversalAmountParser,
    @Optional() @Inject(AiMerchantExtractor)
    private readonly aiMerchantExtractor?: AiMerchantExtractor,
  ) {}
```

3b. Update `parseReceipt` signature for backwards compatibility:

```typescript
async parseReceipt(filePath: string, context?: ReceiptParseContext | string): Promise<any> {
  // Backwards compatibility: old callers pass senderInfo as string
  const ctx: ReceiptParseContext =
    typeof context === 'string' ? { sender: context } : context || {};

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);

    if (mimeType === 'application/pdf') {
      return await this.parsePdfReceipt(fileBuffer, ctx);
    }

    return { confidence: 0.5, extracted: false };
  } catch (error) {
    this.logger.error('Failed to parse receipt', error);
    return null;
  }
}
```

3c. Update `parsePdfReceipt` to use AI-first vendor extraction:

```typescript
private async parsePdfReceipt(buffer: Buffer, ctx: ReceiptParseContext): Promise<any> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;

    const amountWithCurrency = await this.extractAmountWithCurrency(text);
    const amount = amountWithCurrency?.amount;
    const currency = amountWithCurrency?.currency || this.extractCurrency(text) || 'KZT';
    const date = this.extractDate(text);

    // AI-first vendor extraction with rule-based fallback
    const vendor = await this.extractVendorWithAi(text, ctx);

    const tax = this.extractTax(text);
    const lineItems = await this.extractLineItems(text);

    // ... rest unchanged (subtotal, taxRate, confidence, return)
  }
}
```

3d. Add new `extractVendorWithAi` method:

```typescript
private async extractVendorWithAi(
  pdfText: string,
  ctx: ReceiptParseContext,
): Promise<string | undefined> {
  // 1. Try AI extraction
  if (this.aiMerchantExtractor?.isAvailable()) {
    try {
      const aiResult = await this.aiMerchantExtractor.extractMerchant({
        pdfText,
        emailBody: ctx.emailBody,
        sender: ctx.sender,
        subject: ctx.subject,
        dateHeader: ctx.dateHeader,
      });

      if (aiResult && aiResult.confidence >= 0.5) {
        this.logger.debug(`AI merchant: "${aiResult.merchant}" (confidence: ${aiResult.confidence})`);
        return aiResult.merchant;
      }
    } catch (error) {
      this.logger.warn('AI merchant extraction failed, falling back to rule-based', error);
    }
  }

  // 2. Fallback to rule-based
  return this.extractVendor(pdfText, ctx.sender);
}
```

3e. Add `parseFromEmailOnly` method:

```typescript
async parseFromEmailOnly(ctx: ReceiptParseContext): Promise<any> {
  let vendor: string | undefined;

  if (this.aiMerchantExtractor?.isAvailable()) {
    try {
      const aiResult = await this.aiMerchantExtractor.extractMerchant({
        emailBody: ctx.emailBody,
        sender: ctx.sender,
        subject: ctx.subject,
        dateHeader: ctx.dateHeader,
      });
      if (aiResult && aiResult.confidence >= 0.5) {
        vendor = aiResult.merchant;
      }
    } catch (error) {
      this.logger.warn('AI extraction from email failed', error);
    }
  }

  if (!vendor) {
    vendor = this.extractBrandFromSender(ctx.sender);
  }

  const bodyText = ctx.emailBody ? this.stripHtmlBasic(ctx.emailBody) : '';
  const amountWithCurrency = bodyText
    ? await this.extractAmountWithCurrency(bodyText)
    : undefined;

  return {
    amount: amountWithCurrency?.amount,
    currency: amountWithCurrency?.currency || 'USD',
    vendor,
    date: ctx.dateHeader,
    confidence: vendor ? 0.6 : 0.3,
  };
}

private stripHtmlBasic(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Step 4: Register `AiMerchantExtractor` in `GmailModule`**

In `gmail.module.ts`:

```typescript
import { AiMerchantExtractor } from './helpers/ai-merchant-extractor.helper';

// In providers array add:
{
  provide: AiMerchantExtractor,
  useFactory: () => new AiMerchantExtractor(process.env.GEMINI_API_KEY),
},
```

**Step 5: Запустить тесты**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-parser" --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/modules/gmail/services/gmail-receipt-parser.service.ts backend/src/modules/gmail/gmail.module.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
git commit -m "feat(gmail): integrate AI merchant extraction into receipt parser"
```

---

## Task 4: Улучшить rule-based `extractVendor` (fallback)

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts:213-275`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Написать failing тесты**

```typescript
it('skips date-like lines when extracting vendor', () => {
  const vendor = (service as any).extractVendor('Date2026-02-16 10:57AM PST\nGitHub\nTotal: $10.00');
  expect(vendor).toBe('GitHub');
});

it('skips lines that look like timestamps', () => {
  const vendor = (service as any).extractVendor('2026-02-16\n10:57 AM PST\nSpotify');
  expect(vendor).toBe('Spotify');
});

it('skips numeric-only lines', () => {
  const vendor = (service as any).extractVendor('12345\nNetflix');
  expect(vendor).toBe('Netflix');
});

it('skips amount-like lines', () => {
  const vendor = (service as any).extractVendor('$49.99\nAdobe Creative Cloud');
  expect(vendor).toBe('Adobe Creative Cloud');
});

it('skips email address lines', () => {
  const vendor = (service as any).extractVendor('noreply@github.com\nGitHub');
  expect(vendor).toBe('GitHub');
});

it('prioritizes sender brand over dubious PDF line', () => {
  const vendor = (service as any).extractVendor(
    'ABCDEF-12345\nsome random text',
    'Notion <team@makenotion.com>',
  );
  expect(vendor).toBe('Notion');
});
```

**Step 2: Запустить тесты — должны падать**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-parser.service" --no-coverage`

**Step 3: Усилить `extractVendor` дополнительными фильтрами**

Replace the `extractVendor` method at `gmail-receipt-parser.service.ts:213-243`:

```typescript
private extractVendor(text: string, senderName?: string): string | undefined {
  const senderBrand = this.extractBrandFromSender(senderName);
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const skipPattern =
    /^(page\s+\d+\s+of\s+\d+|receipt|invoice|order\s+confirmation|payment\s+receipt|tax\s+invoice|credit\s+note)$/i;
  const datePattern =
    /^(date\s*)?\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{1,2}:\d{2}\s*(am|pm)/i;
  const numericPattern = /^\d+$/;
  const amountPattern = /^[$€£¥₽₸]\s*[\d,.]+$|^[\d,.]+\s*[$€£¥₽₸]$/;
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  const idPattern = /^[A-Z0-9]{6,}-\d+$/;

  for (const line of lines) {
    if (line.length <= 2 || line.length > 40) continue;
    if (skipPattern.test(line)) continue;
    if (datePattern.test(line)) continue;
    if (numericPattern.test(line)) continue;
    if (amountPattern.test(line)) continue;
    if (emailPattern.test(line)) continue;
    if (idPattern.test(line)) continue;
    if (this.isLikelySentence(line)) continue;

    return line.slice(0, 100);
  }

  if (senderBrand) {
    return senderBrand;
  }

  return undefined;
}
```

**Step 4: Запустить тесты**

Run: `cd backend && npx jest --testPathPattern="gmail-receipt-parser.service" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/gmail/services/gmail-receipt-parser.service.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
git commit -m "fix(gmail): harden rule-based vendor extraction with date/amount/email filters"
```

---

## Task 5: Улучшить фронтенд `resolveGmailMerchantLabel`

**Files:**
- Modify: `frontend/app/lib/gmail-merchant.ts`
- Test: `frontend/app/lib/__tests__/gmail-merchant.test.ts`

**Step 1: Написать failing тесты**

```typescript
it('rejects date-like vendor values and falls back to sender', () => {
  const label = resolveGmailMerchantLabel({
    vendor: 'Date2026-02-16 10:57AM PST',
    sender: 'GitHub <noreply@github.com>',
    subject: 'Payment receipt',
  });
  expect(label).toBe('GitHub');
});

it('rejects timestamp-only vendor', () => {
  const label = resolveGmailMerchantLabel({
    vendor: '2026-02-16 10:57',
    sender: 'Spotify <no-reply@spotify.com>',
  });
  expect(label).toBe('Spotify');
});

it('rejects vendor that is just an amount', () => {
  const label = resolveGmailMerchantLabel({
    vendor: '$49.99',
    sender: 'Adobe <mail@adobe.com>',
  });
  expect(label).toBe('Adobe');
});

it('rejects vendor that is an email address', () => {
  const label = resolveGmailMerchantLabel({
    vendor: 'noreply@github.com',
    sender: 'GitHub <noreply@github.com>',
  });
  expect(label).toBe('GitHub');
});
```

**Step 2: Запустить тесты — должны падать**

Run: `cd frontend && npx vitest run app/lib/__tests__/gmail-merchant.test.ts`

**Step 3: Добавить фильтры в `isBrandLikeVendor`**

In `frontend/app/lib/gmail-merchant.ts`, add new patterns and update `isBrandLikeVendor`:

```typescript
// Add after existing pattern declarations (before isBrandLikeVendor):
const DATE_LIKE_PATTERN =
  /^(date\s*)?\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{1,2}:\d{2}\s*(am|pm)/i;

const AMOUNT_LIKE_PATTERN = /^[$€£¥₽₸]\s*[\d,.]+$|^[\d,.]+\s*[$€£¥₽₸]$/;

const EMAIL_LIKE_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

// Update isBrandLikeVendor:
const isBrandLikeVendor = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized.length > 40) {
    return false;
  }

  if (GENERIC_VENDOR_PATTERN.test(normalized)) {
    return false;
  }

  if (DATE_LIKE_PATTERN.test(normalized)) {
    return false;
  }

  if (AMOUNT_LIKE_PATTERN.test(normalized)) {
    return false;
  }

  if (EMAIL_LIKE_PATTERN.test(normalized)) {
    return false;
  }

  return !isLikelySentence(normalized);
};
```

**Step 4: Запустить тесты**

Run: `cd frontend && npx vitest run app/lib/__tests__/gmail-merchant.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/lib/gmail-merchant.ts frontend/app/lib/__tests__/gmail-merchant.test.ts
git commit -m "fix(gmail): reject date/amount/email values in merchant label resolution"
```

---

## Task 6: Endpoint для ретроактивного перепарсинга мерчантов

**Files:**
- Create: `backend/src/modules/gmail/services/gmail-merchant-reparse.service.ts`
- Modify: `backend/src/modules/gmail/gmail.controller.ts`
- Modify: `backend/src/modules/gmail/gmail.module.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-merchant-reparse.service.spec.ts`

**Step 1: Написать failing тест**

```typescript
// backend/@tests/unit/modules/gmail/gmail-merchant-reparse.service.spec.ts
import { GmailMerchantReparseService } from '../../../../src/modules/gmail/services/gmail-merchant-reparse.service';

describe('GmailMerchantReparseService', () => {
  describe('needsReparse', () => {
    let service: GmailMerchantReparseService;

    beforeEach(() => {
      service = new GmailMerchantReparseService(null as any, null as any, null as any);
    });

    it('returns true for date-like vendor', () => {
      expect((service as any).needsReparse({ vendor: 'Date2026-02-16 10:57AM PST' })).toBe(true);
    });

    it('returns true for missing vendor', () => {
      expect((service as any).needsReparse({})).toBe(true);
    });

    it('returns true for empty vendor', () => {
      expect((service as any).needsReparse({ vendor: '' })).toBe(true);
    });

    it('returns true for generic vendor "Page 1 of 1"', () => {
      expect((service as any).needsReparse({ vendor: 'Page 1 of 1' })).toBe(true);
    });

    it('returns true for very long vendor string', () => {
      expect((service as any).needsReparse({ vendor: 'A'.repeat(61) })).toBe(true);
    });

    it('returns false for valid brand vendor', () => {
      expect((service as any).needsReparse({ vendor: 'GitHub' })).toBe(false);
    });

    it('returns false for short valid vendor', () => {
      expect((service as any).needsReparse({ vendor: 'Spotify' })).toBe(false);
    });
  });
});
```

**Step 2: Запустить тест — падает**

Run: `cd backend && npx jest --testPathPattern="gmail-merchant-reparse" --no-coverage`

**Step 3: Реализовать `GmailMerchantReparseService`**

```typescript
// backend/src/modules/gmail/services/gmail-merchant-reparse.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../../../entities';
import {
  AiMerchantExtractor,
  type MerchantExtractionInput,
} from '../helpers/ai-merchant-extractor.helper';
import { GmailReceiptParserService } from './gmail-receipt-parser.service';

type ReparseResult = {
  total: number;
  reparsed: number;
  failed: number;
  skipped: number;
  details: Array<{
    id: string;
    oldVendor?: string;
    newVendor?: string;
    status: string;
  }>;
};

const DATE_LIKE = /^(date\s*)?\d{4}[-/.]\d{2}[-/.]\d{2}|\d{1,2}:\d{2}\s*(am|pm)/i;
const JUNK_VENDOR =
  /^(page\s+\d+(\s+of\s+\d+)?|receipt|invoice|unknown|n\/a|payment|order|confirmation)$/i;

@Injectable()
export class GmailMerchantReparseService {
  private readonly logger = new Logger(GmailMerchantReparseService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    private readonly aiExtractor: AiMerchantExtractor,
    private readonly parserService: GmailReceiptParserService,
  ) {}

  async reparseAll(
    userId: string,
    options?: { dryRun?: boolean; limit?: number },
  ): Promise<ReparseResult> {
    const limit = Math.min(options?.limit || 100, 500);
    const dryRun = options?.dryRun ?? false;

    const receipts = await this.receiptRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const result: ReparseResult = {
      total: receipts.length,
      reparsed: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    for (const receipt of receipts) {
      if (!this.needsReparse(receipt.parsedData)) {
        result.skipped++;
        result.details.push({
          id: receipt.id,
          oldVendor: receipt.parsedData?.vendor,
          status: 'skipped',
        });
        continue;
      }

      try {
        const input: MerchantExtractionInput = {
          sender: receipt.sender,
          subject: receipt.subject,
          dateHeader: receipt.receivedAt?.toISOString(),
        };

        const aiResult = await this.aiExtractor.extractMerchant(input);

        if (aiResult && aiResult.confidence >= 0.5) {
          const oldVendor = receipt.parsedData?.vendor;

          if (!dryRun) {
            receipt.parsedData = {
              ...receipt.parsedData,
              vendor: aiResult.merchant,
            };
            await this.receiptRepository.save(receipt);
          }

          result.reparsed++;
          result.details.push({
            id: receipt.id,
            oldVendor,
            newVendor: aiResult.merchant,
            status: dryRun ? 'would_update' : 'updated',
          });
        } else {
          // Fallback: try sender brand extraction
          const senderBrand = this.extractBrandFromSender(receipt.sender);
          if (senderBrand && this.needsReparse(receipt.parsedData)) {
            const oldVendor = receipt.parsedData?.vendor;

            if (!dryRun) {
              receipt.parsedData = {
                ...receipt.parsedData,
                vendor: senderBrand,
              };
              await this.receiptRepository.save(receipt);
            }

            result.reparsed++;
            result.details.push({
              id: receipt.id,
              oldVendor,
              newVendor: senderBrand,
              status: dryRun ? 'would_update_fallback' : 'updated_fallback',
            });
          } else {
            result.failed++;
            result.details.push({
              id: receipt.id,
              oldVendor: receipt.parsedData?.vendor,
              status: 'ai_failed',
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to reparse receipt ${receipt.id}`, error);
        result.failed++;
        result.details.push({ id: receipt.id, status: 'error' });
      }
    }

    return result;
  }

  private needsReparse(parsedData?: any): boolean {
    if (!parsedData?.vendor) return true;
    const vendor = String(parsedData.vendor).trim();
    if (!vendor) return true;
    if (DATE_LIKE.test(vendor)) return true;
    if (JUNK_VENDOR.test(vendor)) return true;
    if (vendor.length > 60) return true;
    return false;
  }

  private extractBrandFromSender(sender?: string): string | undefined {
    if (!sender) return undefined;

    const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
    if (displayName && !displayName.includes('@')) {
      const cleaned = displayName
        .replace(
          /\s+(support|billing|payments?|service|team|notifications?)$/i,
          '',
        )
        .trim();
      return cleaned || displayName;
    }

    const emailMatch = sender.match(
      /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i,
    );
    const root = emailMatch?.[1]?.split('.')[0];
    return root
      ? `${root.charAt(0).toUpperCase()}${root.slice(1).toLowerCase()}`
      : undefined;
  }
}
```

**Step 4: Add endpoint to controller and register in module**

In `gmail.controller.ts`, add import and inject:

```typescript
import { GmailMerchantReparseService } from './services/gmail-merchant-reparse.service';

// In constructor:
private readonly merchantReparseService: GmailMerchantReparseService,

// Add endpoint:
@Post('receipts/reparse-merchants')
@ApiOperation({ summary: 'Reparse merchant names for receipts with bad vendor data' })
async reparseMerchants(
  @CurrentUser() user: User,
  @Body() body: { dryRun?: boolean; limit?: number },
) {
  return this.merchantReparseService.reparseAll(user.id, {
    dryRun: body.dryRun,
    limit: body.limit,
  });
}
```

In `gmail.module.ts`, add provider:

```typescript
import { GmailMerchantReparseService } from './services/gmail-merchant-reparse.service';

// In providers array:
GmailMerchantReparseService,
```

**Step 5: Запустить тесты**

Run: `cd backend && npx jest --testPathPattern="gmail-merchant-reparse" --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/modules/gmail/services/gmail-merchant-reparse.service.ts backend/src/modules/gmail/gmail.controller.ts backend/src/modules/gmail/gmail.module.ts backend/@tests/unit/modules/gmail/gmail-merchant-reparse.service.spec.ts
git commit -m "feat(gmail): add endpoint for retroactive merchant reparsing via AI"
```

---

## Task 7: Финальная интеграция и end-to-end проверка

**Files:**
- All modified files from Tasks 1-6

**Step 1: Запустить все backend тесты**

Run: `cd backend && npm test -- --no-coverage`
Expected: All pass

**Step 2: Запустить все frontend тесты**

Run: `cd frontend && npx vitest run`
Expected: All pass

**Step 3: Запустить линтер**

Run: `make lint`
Expected: No errors

**Step 4: Запустить format**

Run: `make format`
Expected: All files formatted

**Step 5: Final commit if needed**

```bash
git add -A
git commit -m "style: format after AI merchant extraction implementation"
```

---

## Диаграмма нового pipeline

```
Gmail Email
    |
    +-- Headers: From, Subject, Date
    +-- Body: HTML/Text
    +-- Attachments: PDF
         |
         v
  GmailReceiptProcessor
    |
    +-- extractEmailBody(payload)  <-- NEW
    |
    v
  GmailReceiptParserService.parseReceipt()
    |
    +-- 1. AI Merchant (Gemini)    <-- NEW (AI-FIRST)
    |   Input: PDF text + email body + sender + subject + date
    |   Output: { merchant: "GitHub", confidence: 0.95 }
    |
    +-- 2. Rule-based Fallback     <-- IMPROVED
    |   - Skip dates, amounts, emails, IDs
    |   - Better sentence detection
    |   - Sender brand extraction
    |
    +-- 3. Confidence merge
         |
         v
  Receipt.parsedData.vendor = "GitHub"
         |
         v
  Frontend: resolveGmailMerchantLabel()  <-- HARDENED
    - Reject date-like values
    - Reject amount-like values
    - Reject email addresses
    - Priority: vendor -> sender -> subject -> fallback
```

---

## Acceptance Criteria

1. **AI-first:** Для каждого нового чека Gemini анализирует все источники данных и определяет мерчанта.
2. **Без дат в vendor:** `Date2026-02-16 10:57AM PST` никогда не попадёт в поле merchant — отфильтровывается и на backend, и на frontend.
3. **Email body парсинг:** Чеки без PDF attachment тоже получают корректного мерчанта из тела письма.
4. **Ретроактивный перепарсинг:** Endpoint `POST /integrations/gmail/receipts/reparse-merchants` позволяет перепарсить существующие чеки. Поддерживает `dryRun: true` для предварительного просмотра.
5. **Graceful fallback:** Если AI недоступен (circuit breaker, rate limit), rule-based извлечение работает лучше прежнего.
6. **Существующие тесты:** Все существующие тесты проходят. Новые тесты покрывают AI helper, reparse service, и улучшенные фильтры.

---

## Риски и mitigation

| Риск | Mitigation |
|---|---|
| Gemini API rate limit / downtime | Circuit breaker + fallback на rule-based (уже есть `ai-runtime.util.ts`) |
| Стоимость AI при большом объёме | ~$0.001-0.003/чек, в рамках бюджета; limit на reparse endpoint |
| AI возвращает неправильный merchant | `parseResponse` валидирует: отклоняет даты, пустые, длинные строки |
| Ретроспективный reparse ломает хорошие vendor | `needsReparse()` проверяет только чеки с плохим vendor; dry run для preview |
| Email body содержит sensitive data | `redactSensitive()` маскирует IBAN/карты перед отправкой в AI |
