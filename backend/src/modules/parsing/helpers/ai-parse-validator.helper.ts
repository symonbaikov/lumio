import { BaseAiHelper } from '../../../common/helpers/base-ai.helper';
import { mapParsedTransaction } from '../../../common/utils/ai-response.util';
import { normalizeDate, normalizeNumber } from '../../../common/utils/number-normalizer.util';
import { extractTextFromPdf } from '../../../common/utils/pdf-parser.util';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { isAiCircuitOpen, redactSensitive } from './ai-runtime.util';

export class AiParseValidator extends BaseAiHelper {
  async reconcileFromPdf(
    filePath: string,
    parsed: ParsedStatement,
  ): Promise<{ corrected: ParsedStatement; notes: string[] }> {
    if (isAiCircuitOpen()) {
      return {
        corrected: parsed,
        notes: ['AI temporarily disabled (circuit breaker)'],
      };
    }

    if (!this.isAvailable()) {
      return { corrected: parsed, notes: [] };
    }

    const pdfTextRaw = await extractTextFromPdf(filePath);
    const pdfText = pdfTextRaw.length > 18000 ? pdfTextRaw.substring(0, 18000) : pdfTextRaw;
    const parsedPreview = JSON.stringify(parsed.transactions.slice(0, 20));
    const redactedPdf = redactSensitive(pdfText);
    const redactedPreview = redactSensitive(parsedPreview);
    const detectedCurrency = parsed.metadata?.currency;
    const currencyInstruction = detectedCurrency
      ? `Use ${detectedCurrency} currency.`
      : 'For currency, use the currency shown in the statement.';

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);
      const content = await this.generateJsonContent(
        [
          {
            role: 'user',
            parts: [
              {
                text: `You are an auditor for Bereke Bank statements. Compare PDF text with parsed transactions and correct mistakes or missing rows. Return ONLY JSON with shape {"transactions":[...],"notes":[...],"metadata":{...}}. Dates must be ISO (YYYY-MM-DD). Numbers should be decimal (dot). ${currencyInstruction}

PDF text snippet (redacted):
${redactedPdf}

Parsed transactions preview (redacted):
${redactedPreview}`,
              },
            ],
          },
        ],
        {
          timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 20000,
          timeoutMessage: 'AI request timed out',
          retries: 2,
          baseDelayMs: 500,
          maxDelayMs: 5000,
        },
      );
      if (!content) {
        return { corrected: parsed, notes: ['AI returned empty content'] };
      }

      const data = JSON.parse(content);
      const rawTransactions = data?.transactions || data?.data?.transactions || parsed.transactions;

      const mapped = Array.isArray(rawTransactions)
        ? rawTransactions
            .map((tx: Record<string, unknown>) =>
              mapParsedTransaction(tx, {
                normalizeDate,
                normalizeNumber,
              }),
            )
            .filter((tx): tx is ParsedTransaction => tx !== null)
        : parsed.transactions;

      const notes = Array.isArray(data?.notes) ? data.notes.map((n: unknown) => String(n)) : [];

      const meta = data?.metadata || {};
      const corrected: ParsedStatement = {
        metadata: {
          ...parsed.metadata,
          accountNumber: meta.accountNumber || parsed.metadata.accountNumber,
          dateFrom:
            normalizeDate(meta.dateFrom || meta.date_from || '') || parsed.metadata.dateFrom,
          dateTo: normalizeDate(meta.dateTo || meta.date_to || '') || parsed.metadata.dateTo,
          balanceStart:
            normalizeNumber(meta.balanceStart || meta.balance_start) ??
            parsed.metadata.balanceStart,
          balanceEnd:
            normalizeNumber(meta.balanceEnd || meta.balance_end) ?? parsed.metadata.balanceEnd,
          currency: meta.currency || parsed.metadata.currency,
        },
        transactions: mapped.length ? mapped : parsed.transactions,
      };

      return { corrected, notes };
    } catch (error) {
      console.error('[AIValidator] Failed to reconcile via AI:', error);
      return { corrected: parsed, notes: ['AI reconciliation failed'] };
    }
  }
}
