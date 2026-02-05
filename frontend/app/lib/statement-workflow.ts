export type StatementStage = 'submit' | 'approve' | 'pay';

const STORAGE_KEY = 'finflow-statement-stage';

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
