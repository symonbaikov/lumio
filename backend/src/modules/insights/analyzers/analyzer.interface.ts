import {
  InsightCategory,
  InsightSeverity,
  type InsightType,
} from '../../../entities/insight.entity';

export type InsightActionType =
  | 'CREATE_RULE'
  | 'GO_TO_UNAPPROVED'
  | 'RUN_AI_CLASSIFICATION'
  | 'VIEW_REPORT'
  | 'DISMISS';

export interface InsightAction {
  type: InsightActionType;
  label: string;
  payload?: Record<string, unknown>;
}

export interface AnalysisContext {
  userId: string;
  workspaceId: string | null;
}

export interface InsightCandidate {
  type: InsightType;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  message: string;
  deduplicationKey: string;
  data?: Record<string, unknown>;
  actions?: InsightAction[];
  expiresAt?: Date | null;
}

export interface InsightAnalyzer {
  analyze(context: AnalysisContext): Promise<InsightCandidate[]>;
}
