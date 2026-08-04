import { BaseAiHelper } from '../../../common/helpers/base-ai.helper';
import { mapParsedTransaction } from '../../../common/utils/ai-response.util';
import { normalizeDate, normalizeNumber } from '../../../common/utils/number-normalizer.util';
import type { ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { isAiCircuitOpen, redactSensitive } from './ai-runtime.util';

export class AiTransactionExtractor extends BaseAiHelper {
  /**
   * @param defaultCurrency Currency detected in the statement, when the caller
   *   found one. Left undefined the model is told to use whatever the statement
   *   shows rather than being nudged towards a specific currency.
   */
  async extractTransactions(text: string, defaultCurrency?: string): Promise<ParsedTransaction[]> {
    if (!this.isAvailable()) {
      return [];
    }

    if (isAiCircuitOpen()) {
      return [];
    }

    const statementText = text.length > 20000 ? text.substring(0, 20000) : text;
    const redactedText = redactSensitive(statementText);
    const currencyInstruction = defaultCurrency
      ? `Default currency ${defaultCurrency}.`
      : 'For currency, use the currency shown in the statement.';

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);
      const content = await this.generateJsonContent(
        [
          {
            role: 'user',
            parts: [
              {
                text: `Extract ALL transactions from this bank statement text (could be Kaspi Bank, Bereke Bank, or other Kazakhstan banks). Each transaction typically has: document number, date, debit amount, credit amount, counterparty name, account numbers, payment purpose. Return ONLY JSON with the shape {"transactions":[{date,document_number,counterparty_name,counterparty_bin,counterparty_account,counterparty_bank,debit,credit,purpose,currency}]}. Use ISO dates (YYYY-MM-DD). Numbers must be decimal (dot). ${currencyInstruction} Preserve full payment purpose. Extract ALL transactions you can find.

${redactedText}`,
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
        return [];
      }

      const parsed = JSON.parse(content);
      const rawTransactions = parsed?.transactions || parsed?.data?.transactions || [];

      if (!Array.isArray(rawTransactions)) {
        return [];
      }

      return rawTransactions
        .map((tx: Record<string, unknown>) =>
          mapParsedTransaction(tx, {
            normalizeDate,
            normalizeNumber,
          }),
        )
        .filter((tx): tx is ParsedTransaction => tx !== null);
    } catch (error) {
      console.error('[AIExtractor] Failed to extract via AI:', error);
      return [];
    }
  }
}
