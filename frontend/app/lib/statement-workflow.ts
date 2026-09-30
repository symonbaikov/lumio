import { getIntlayer } from 'react-intlayer';
import apiClient from '@/app/lib/api';
import { DEFAULT_LOCALE, readLocaleFromCookie } from '@/app/lib/locale';

export type StatementStage = 'submit' | 'approve' | 'pay';
export type StatementStageActionId =
  | 'submitForApproval'
  | 'unapprove'
  | 'pay'
  | 'rollbackToApprove';

export interface StatementStageAction {
  id: StatementStageActionId;
  nextStage: StatementStage;
  redirectPath: '/statements/submit' | '/statements/approve' | '/statements/pay';
}

export interface StatementStageCounts {
  submit: number;
  approve: number;
  pay: number;
}

const STAGE_ACTIONS: Record<StatementStage, StatementStageAction[]> = {
  submit: [
    {
      id: 'submitForApproval',
      nextStage: 'approve',
      redirectPath: '/statements/approve',
    },
  ],
  approve: [
    {
      id: 'unapprove',
      nextStage: 'submit',
      redirectPath: '/statements/submit',
    },
    {
      id: 'pay',
      nextStage: 'pay',
      redirectPath: '/statements/pay',
    },
  ],
  pay: [
    {
      id: 'rollbackToApprove',
      nextStage: 'approve',
      redirectPath: '/statements/approve',
    },
  ],
};

const EMPTY_STAGE_COUNTS: StatementStageCounts = {
  submit: 0,
  approve: 0,
  pay: 0,
};

/** Anything carrying the server's `stage` column; rows from before it default to submit. */
export interface StagedStatement {
  stage?: StatementStage | null;
}

export function resolveStatementStage(statement: StagedStatement): StatementStage {
  return statement.stage ?? 'submit';
}

export type StatementStageSkipCode =
  | 'STATEMENT_NOT_FOUND'
  | 'STATEMENT_EDIT_FORBIDDEN'
  | 'INVALID_STAGE_TRANSITION'
  | 'UNCATEGORIZED_TRANSACTIONS'
  | 'RECEIPT_NOT_FOUND'
  | 'RECEIPT_EDIT_FORBIDDEN'
  | 'MISSING_RECEIPT_DATA';

export interface StatementStageUpdateResult {
  /** Now in the requested stage, including ones that already were. */
  updated: string[];
  skipped: Array<{ id: string; code: StatementStageSkipCode }>;
}

/** Why the server refused to move a statement, in words for a toast. */
export const STATEMENT_STAGE_SKIP_MESSAGES: Record<StatementStageSkipCode, string> = {
  STATEMENT_NOT_FOUND: 'Statement not found in this workspace',
  STATEMENT_EDIT_FORBIDDEN: 'Only the uploader or a workspace admin can move this statement',
  INVALID_STAGE_TRANSITION: 'The statement is no longer in this stage; reload and try again',
  UNCATEGORIZED_TRANSACTIONS: 'Assign categories to all transactions first',
  RECEIPT_NOT_FOUND: 'Receipt not found in this workspace',
  RECEIPT_EDIT_FORBIDDEN: 'Only the uploader or a workspace admin can move this receipt',
  MISSING_RECEIPT_DATA: 'The receipt needs an amount and a date first',
};

/** The skip reason in the user's language; the English text above is the fallback. */
export function statementStageSkipMessage(code: StatementStageSkipCode): string {
  const messages = getIntlayer(
    'statementStageSkipMessages',
    readLocaleFromCookie() ?? DEFAULT_LOCALE,
  );
  return messages[code]?.value ?? STATEMENT_STAGE_SKIP_MESSAGES[code];
}

/** Moves one or many statements; the server checks each move and reports the ones it refused. */
export async function updateStatementStages(
  statementIds: string[],
  stage: StatementStage,
): Promise<StatementStageUpdateResult> {
  const response = await apiClient.post<StatementStageUpdateResult>('/statements/stage', {
    statementIds,
    stage,
  });
  return response.data;
}

/** Same move for receipts (Submit ↔ Approve only); scans take their statement along. */
export async function updateReceiptStages(
  receiptIds: string[],
  stage: StatementStage,
): Promise<StatementStageUpdateResult> {
  const response = await apiClient.post<StatementStageUpdateResult>('/receipts/stage', {
    receiptIds,
    stage,
  });
  return response.data;
}

/**
 * Before the stage lived on the server, each browser kept its own copy under
 * this key. `migrateLocalStatementStages` hands it to the server once.
 */
const LEGACY_STORAGE_KEY = 'lumio-statement-stage';

function readLegacyStageMap(): Record<string, StatementStage> {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, StatementStage>) : {};
  } catch {
    return {};
  }
}

let legacyMigration: Promise<void> | null = null;

/**
 * Replays this browser's old local stages on the server: approve first, then
 * pay (the server allows no jump from submit to pay). Runs once per page load,
 * however many lists ask, and drops the local copy after the server answered —
 * entries it refused (uncategorised, deleted, or of a workspace other than the
 * open one) would otherwise be re-sent on every load forever; those statements
 * stay in Submit.
 */
export function migrateLocalStatementStages(): Promise<void> {
  legacyMigration ??= (async () => {
    if (typeof window === 'undefined') {
      return;
    }
    const legacy = readLegacyStageMap();
    const approveIds = Object.keys(legacy).filter(id => legacy[id] !== 'submit');
    if (approveIds.length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    const payIds = approveIds.filter(id => legacy[id] === 'pay');
    try {
      const first = await updateStatementStages(approveIds, 'approve');
      const movable = payIds.filter(id => first.updated.includes(id));
      if (movable.length > 0) {
        await updateStatementStages(movable, 'pay');
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Offline or a server error: keep the local copy and try on the next page load.
    }
  })();
  return legacyMigration;
}

export function getStatementStageActions(stage: StatementStage): StatementStageAction[] {
  return STAGE_ACTIONS[stage] ?? STAGE_ACTIONS.submit;
}

export function isStageActionBlocked(
  actionId: StatementStageActionId,
  missingCategoryCount: number,
): boolean {
  return actionId === 'submitForApproval' && missingCategoryCount > 0;
}

export function countStatementStages(statements: StagedStatement[]): StatementStageCounts {
  return statements.reduce<StatementStageCounts>(
    (acc, statement) => {
      acc[resolveStatementStage(statement)] += 1;
      return acc;
    },
    { ...EMPTY_STAGE_COUNTS },
  );
}
