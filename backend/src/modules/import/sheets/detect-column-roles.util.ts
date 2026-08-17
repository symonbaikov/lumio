import type { SheetColumnRole } from './column-roles';
import { parseSheetAmount } from './parse-amount.util';
import { parseSheetDate } from './parse-date.util';

export interface SheetColumnInput {
  title: string;
  samples: unknown[];
}

/** Roles that can be assigned to at most one column per sheet. */
const SINGLE_SLOT_ROLES = [
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'counterparty',
  'category',
  'wallet',
  'currency',
  'externalId',
] as const satisfies readonly SheetColumnRole[];

type SingleSlotRole = (typeof SINGLE_SLOT_ROLES)[number];

const HEADER_KEYWORDS: Record<SingleSlotRole, string[]> = {
  date: ['дата', 'date', 'день', 'күні'],
  amount: ['сумма', 'amount', 'total', 'итого', 'сомасы'],
  debit: ['расход', 'списание', 'debit', 'withdrawal', 'out', 'шығыс'],
  credit: ['приход', 'поступление', 'доход', 'credit', 'deposit', 'in', 'кіріс'],
  description: ['описание', 'назначение', 'комментарий', 'description', 'note', 'memo', 'purpose'],
  counterparty: ['контрагент', 'получатель', 'продавец', 'merchant', 'payee', 'vendor'],
  category: ['категория', 'category', 'статья'],
  wallet: ['счет', 'счёт', 'кошелек', 'карта', 'account', 'wallet', 'card'],
  currency: ['валюта', 'currency', 'cur'],
  externalId: ['id', 'идентификатор', 'uuid', 'ref'],
};

/**
 * A candidate's `pass` determines resolution priority: header keyword matches
 * (`'header'`) always outrank content-inferred matches (`'content'`) for the
 * same role — a column with an explicit keyword header is trusted over a
 * column that merely "looks like" that role's data. `score` only breaks ties
 * within the same pass; scores are never compared across passes, so it
 * doesn't matter that Pass A scores (keyword length) and Pass B scores (match
 * ratio / constant) live on different scales.
 */
interface RoleCandidate {
  role: SingleSlotRole;
  pass: 'header' | 'content';
  score: number;
}

const PASS_PRIORITY: Record<RoleCandidate['pass'], number> = { header: 1, content: 0 };

const normalizeHeader = (title: string): string => title.toLowerCase();

/** Splits a normalized header into word tokens so keywords match whole words only. */
const tokenize = (normalized: string): string[] =>
  normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Pass A: the best header-keyword match for a single column, if any. Keywords
 * must match a whole token, not an arbitrary substring — otherwise short
 * keywords like `in`, `out`, `id`, `cur`, `ref` would false-positive on
 * unrelated words (e.g. "Recurring" contains "cur", "About Payment" contains
 * "out").
 */
const matchHeaderRole = (title: string): RoleCandidate | null => {
  const tokens = tokenize(normalizeHeader(title));
  let best: RoleCandidate | null = null;
  for (const role of SINGLE_SLOT_ROLES) {
    for (const keyword of HEADER_KEYWORDS[role]) {
      if (tokens.includes(keyword) && (!best || keyword.length > best.score)) {
        best = { role, pass: 'header', score: keyword.length };
      }
    }
  }
  return best;
};

const CONTENT_SAMPLE_THRESHOLD = 0.8;
const MAX_CATEGORY_DISTINCT_VALUES = 20;
// "short strings" per the spec: a category enumerates short labels (e.g. "Еда",
// "Транспорт"), not long free-text notes that merely happen to repeat.
const MAX_CATEGORY_VALUE_LENGTH = 50;

/** Pass B: content-based inference for a column the header pass couldn't score. */
const inferContentRole = (samples: unknown[]): RoleCandidate | null => {
  const nonEmpty = samples.map(s => String(s ?? '').trim()).filter(s => s.length > 0);
  if (nonEmpty.length === 0) {
    return null;
  }

  const dateRatio = nonEmpty.filter(s => parseSheetDate(s) !== null).length / nonEmpty.length;
  if (dateRatio >= CONTENT_SAMPLE_THRESHOLD) {
    return { role: 'date', pass: 'content', score: dateRatio };
  }

  const amountRatio = nonEmpty.filter(s => parseSheetAmount(s) !== null).length / nonEmpty.length;
  if (amountRatio >= CONTENT_SAMPLE_THRESHOLD) {
    return { role: 'amount', pass: 'content', score: amountRatio };
  }

  // A category column enumerates a small set of short, repeated values; if
  // every sample is distinct there's no repetition evidence, and if values
  // run long they read as free text, so both cases fall through to
  // `description` even when the raw distinct count is small.
  const distinctCount = new Set(nonEmpty).size;
  const allShort = nonEmpty.every(s => s.length <= MAX_CATEGORY_VALUE_LENGTH);
  if (
    distinctCount <= MAX_CATEGORY_DISTINCT_VALUES &&
    distinctCount < nonEmpty.length &&
    allShort
  ) {
    return { role: 'category', pass: 'content', score: 1 };
  }

  return { role: 'description', pass: 'content', score: 1 };
};

/**
 * Detects the semantic role of each column of a sheet, using header keywords
 * (ru/en/kk) first and falling back to content inference for columns whose
 * header didn't match. Every role except `ignore` is single-slot: at most one
 * column in the sheet can win it. Resolution ranks candidates by pass first
 * (header beats content), then by score as a tiebreaker; any other candidate
 * for that role falls back to `ignore`.
 */
export const detectColumnRoles = (columns: SheetColumnInput[]): SheetColumnRole[] => {
  const candidatesByColumn: (RoleCandidate | null)[] = columns.map(column => {
    const headerMatch = matchHeaderRole(column.title);
    return headerMatch ?? inferContentRole(column.samples);
  });

  const roles: SheetColumnRole[] = columns.map(() => 'ignore');

  for (const role of SINGLE_SLOT_ROLES) {
    let winnerIndex = -1;
    let winner: RoleCandidate | null = null;
    candidatesByColumn.forEach((candidate, index) => {
      if (candidate?.role !== role) {
        return;
      }
      const isBetter =
        !winner ||
        PASS_PRIORITY[candidate.pass] > PASS_PRIORITY[winner.pass] ||
        (PASS_PRIORITY[candidate.pass] === PASS_PRIORITY[winner.pass] &&
          candidate.score > winner.score);
      if (isBetter) {
        winner = candidate;
        winnerIndex = index;
      }
    });
    if (winnerIndex >= 0) {
      roles[winnerIndex] = role;
    }
  }

  return roles;
};
