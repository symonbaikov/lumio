/**
 * Token accounting for the context packet.
 *
 * The real tokenizer only exists inside a loaded model, and the packet has to be
 * sized before generation starts. So this estimates, and deliberately estimates
 * high: overshooting wastes a little context, undershooting overflows it and the
 * runtime silently drops the oldest part of the prompt — which is the data.
 *
 * Cyrillic costs roughly twice as many tokens per character as Latin in the BPE
 * vocabularies these models use, so the two are counted separately rather than
 * with one average that would be wrong for both.
 */

const LATIN_CHARS_PER_TOKEN = 3.5;
const CYRILLIC_CHARS_PER_TOKEN = 1.8;
const OTHER_CHARS_PER_TOKEN = 2.5;

export function estimateTokens(text: string): number {
  let latin = 0;
  let cyrillic = 0;
  let other = 0;

  for (const char of text) {
    if (/[a-zA-Z0-9\s.,:;()[\]{}\-+*/%$€₸₽]/.test(char)) {
      latin += 1;
    } else if (/[Ѐ-ӿ]/.test(char)) {
      cyrillic += 1;
    } else {
      other += 1;
    }
  }

  return Math.ceil(
    latin / LATIN_CHARS_PER_TOKEN +
      cyrillic / CYRILLIC_CHARS_PER_TOKEN +
      other / OTHER_CHARS_PER_TOKEN,
  );
}

/** Room kept aside from the model's window for things other than the data. */
export interface BudgetReserve {
  systemPrompt: number;
  question: number;
  answer: number;
  history: number;
}

export const DEFAULT_RESERVE: BudgetReserve = {
  systemPrompt: 250,
  question: 150,
  answer: 700,
  history: 400,
};

/**
 * How many tokens the data section may occupy for a given model.
 * Returns 0 rather than a negative number when the window is too small to be
 * usable at all — the caller then knows there is no room for data.
 */
export function contextBudgetTokens(
  modelContextTokens: number,
  reserve: BudgetReserve = DEFAULT_RESERVE,
): number {
  const reserved = reserve.systemPrompt + reserve.question + reserve.answer + reserve.history;
  return Math.max(0, modelContextTokens - reserved);
}
