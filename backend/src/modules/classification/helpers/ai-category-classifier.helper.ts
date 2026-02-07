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

export type TransactionCategoryInput = {
  index: number;
  counterpartyName?: string | null;
  paymentPurpose?: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type AiCategoryMatch = {
  index: number;
  categoryName: string;
  categoryId: string;
  confidence: number;
};

export type AiCategoryBatchResult = {
  matches: AiCategoryMatch[];
  failedCount: number;
};

export const AI_CATEGORY_BATCH_SIZE = 20;
export const AI_CATEGORY_CONFIDENCE_THRESHOLD = 0.9;

export class AiCategoryClassifier {
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

  async classifyBatch(
    transactions: TransactionCategoryInput[],
    categories: CategoryOption[],
  ): Promise<AiCategoryBatchResult> {
    if (!transactions.length) {
      return { matches: [], failedCount: 0 };
    }

    if (!categories.length || !this.isAvailable()) {
      return { matches: [], failedCount: transactions.length };
    }

    const matches: AiCategoryMatch[] = [];
    let failedCount = 0;

    for (let start = 0; start < transactions.length; start += AI_CATEGORY_BATCH_SIZE) {
      const chunk = transactions.slice(start, start + AI_CATEGORY_BATCH_SIZE);
      const chunkResult = await this.classifyChunk(chunk, categories);
      matches.push(...chunkResult.matches);
      failedCount += chunkResult.failedCount;
    }

    return { matches, failedCount };
  }

  private async classifyChunk(
    transactions: TransactionCategoryInput[],
    categories: CategoryOption[],
  ): Promise<AiCategoryBatchResult> {
    if (!this.geminiModel || isAiCircuitOpen()) {
      return { matches: [], failedCount: transactions.length };
    }

    const prompt = this.buildPrompt(transactions, categories);
    const categoryMap = new Map(
      categories.map(category => [category.name.trim().toLowerCase(), category.id]),
    );

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
                    parts: [{ text: prompt }],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            Number.isFinite(timeoutMs) ? timeoutMs : 20000,
            'AI category classification request timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 500,
          maxDelayMs: 2000,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      const content = completion?.response?.text();
      if (!content) {
        recordAiFailure();
        return { matches: [], failedCount: transactions.length };
      }

      const parsed = JSON.parse(content);
      const rawClassifications = parsed?.classifications || parsed?.results || [];
      if (!Array.isArray(rawClassifications)) {
        recordAiFailure();
        return { matches: [], failedCount: transactions.length };
      }

      const validIndexes = new Set(transactions.map(item => item.index));
      const matchedIndexes = new Set<number>();
      const matches: AiCategoryMatch[] = [];

      for (const item of rawClassifications) {
        const index = Number(item?.index);
        if (!Number.isFinite(index) || !validIndexes.has(index)) {
          continue;
        }

        const categoryName = String(item?.category || item?.categoryName || '').trim();
        if (!categoryName) {
          continue;
        }

        const confidence = Number(item?.confidence);
        if (!Number.isFinite(confidence) || confidence < AI_CATEGORY_CONFIDENCE_THRESHOLD) {
          continue;
        }

        const categoryId = categoryMap.get(categoryName.toLowerCase());
        if (!categoryId || matchedIndexes.has(index)) {
          continue;
        }

        matchedIndexes.add(index);
        matches.push({
          index,
          categoryName,
          categoryId,
          confidence,
        });
      }

      recordAiSuccess();

      return {
        matches,
        failedCount: transactions.length - matchedIndexes.size,
      };
    } catch (error) {
      recordAiFailure();
      console.error('[AiCategoryClassifier] Failed to classify transactions:', error);
      return { matches: [], failedCount: transactions.length };
    }
  }

  private buildPrompt(
    transactions: TransactionCategoryInput[],
    categories: CategoryOption[],
  ): string {
    const sanitizedTransactions = transactions.map(item => ({
      index: item.index,
      counterparty: redactSensitive(String(item.counterpartyName || '')).slice(0, 300),
      purpose: redactSensitive(String(item.paymentPurpose || '')).slice(0, 800),
    }));

    const categoryNames = categories.map(category => category.name);

    return `You classify financial transactions into predefined categories.
Return ONLY JSON with shape {"classifications":[{"index":number,"category":string,"confidence":number}]}

Rules:
- Use ONLY category names from the provided list.
- confidence must be between 0 and 1.
- Use confidence >= 0.90 only for very certain classifications.
- If uncertain, return lower confidence.

Available categories:
${JSON.stringify(categoryNames)}

Transactions:
${JSON.stringify(sanitizedTransactions)}
`;
  }
}
