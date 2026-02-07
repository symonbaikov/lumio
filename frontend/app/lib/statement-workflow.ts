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

const STORAGE_KEY = 'finflow-statement-stage';

const EMPTY_STAGE_COUNTS: StatementStageCounts = {
  submit: 0,
  approve: 0,
  pay: 0,
};

export function getStatementStageMap(): Record<string, StatementStage> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, StatementStage>;
  } catch {
    return {};
  }
}

export function getStatementStage(statementId: string): StatementStage {
  const map = getStatementStageMap();
  return map[statementId] ?? 'submit';
}

export function setStatementStage(statementId: string, stage: StatementStage): void {
  if (typeof window === 'undefined') return;
  const map = getStatementStageMap();
  map[statementId] = stage;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
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

export function countStatementStages(
  statementIds: string[],
  stageMap: Record<string, StatementStage>,
): StatementStageCounts {
  return statementIds.reduce<StatementStageCounts>((acc, statementId) => {
    const stage = stageMap[statementId] ?? 'submit';
    acc[stage] += 1;
    return acc;
  }, { ...EMPTY_STAGE_COUNTS });
}
