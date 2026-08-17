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

interface RoleCandidate {
  role: SingleSlotRole;
  score: number;
}

const normalizeHeader = (title: string): string => title.toLowerCase().replace(/\s+/g, '');

/** Pass A: the best header-keyword match for a single column, if any. */
const matchHeaderRole = (title: string): RoleCandidate | null => {
  const normalized = normalizeHeader(title);
  let best: RoleCandidate | null = null;
  for (const role of SINGLE_SLOT_ROLES) {
    for (const keyword of HEADER_KEYWORDS[role]) {
      if (normalized.includes(keyword) && (!best || keyword.length > best.score)) {
        best = { role, score: keyword.length };
      }
    }
  }
  return best;
};

const CONTENT_SAMPLE_THRESHOLD = 0.8;
const MAX_CATEGORY_DISTINCT_VALUES = 20;

/** Pass B: content-based inference for a column the header pass couldn't score. */
const inferContentRole = (samples: unknown[]): RoleCandidate | null => {
  const nonEmpty = samples.map(s => String(s ?? '').trim()).filter(s => s.length > 0);
  if (nonEmpty.length === 0) {
    return null;
  }

  const dateRatio = nonEmpty.filter(s => parseSheetDate(s) !== null).length / nonEmpty.length;
  if (dateRatio >= CONTENT_SAMPLE_THRESHOLD) {
    return { role: 'date', score: dateRatio };
  }

  const amountRatio = nonEmpty.filter(s => parseSheetAmount(s) !== null).length / nonEmpty.length;
  if (amountRatio >= CONTENT_SAMPLE_THRESHOLD) {
    return { role: 'amount', score: amountRatio };
  }

  // A category column enumerates a small set of repeated values; if every
  // sample is distinct there's no repetition evidence, so it reads as free
  // text (`description`) even when the raw distinct count is small.
  const distinctCount = new Set(nonEmpty).size;
  if (distinctCount <= MAX_CATEGORY_DISTINCT_VALUES && distinctCount < nonEmpty.length) {
    return { role: 'category', score: 1 };
  }

  return { role: 'description', score: 1 };
};

/**
 * Detects the semantic role of each column of a sheet, using header keywords
 * (ru/en/kk) first and falling back to content inference for columns whose
 * header didn't match. Every role except `ignore` is single-slot: at most one
 * column in the sheet can win it, with the highest score taking it and any
 * other candidates for that role falling back to `ignore`.
 */
export const detectColumnRoles = (columns: SheetColumnInput[]): SheetColumnRole[] => {
  const candidatesByColumn: (RoleCandidate | null)[] = columns.map(column => {
    const headerMatch = matchHeaderRole(column.title);
    return headerMatch ?? inferContentRole(column.samples);
  });

  const roles: SheetColumnRole[] = columns.map(() => 'ignore');

  for (const role of SINGLE_SLOT_ROLES) {
    let winnerIndex = -1;
    let winnerScore = Number.NEGATIVE_INFINITY;
    candidatesByColumn.forEach((candidate, index) => {
      if (candidate?.role === role && candidate.score > winnerScore) {
        winnerIndex = index;
        winnerScore = candidate.score;
      }
    });
    if (winnerIndex >= 0) {
      roles[winnerIndex] = role;
    }
  }

  return roles;
};
