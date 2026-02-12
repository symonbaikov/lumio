import apiClient from '@/app/lib/api';

export type ActorType = 'user' | 'system' | 'integration';
export type EntityType =
  | 'transaction'
  | 'statement'
  | 'receipt'
  | 'category'
  | 'rule'
  | 'workspace'
  | 'integration'
  | 'table_row'
  | 'table_cell'
  | 'branch'
  | 'wallet'
  | 'custom_table'
  | 'custom_table_column';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'import'
  | 'link'
  | 'unlink'
  | 'match'
  | 'unmatch'
  | 'apply_rule'
  | 'rollback'
  | 'export';

export type Severity = 'info' | 'warn' | 'critical';

export type BeforeAfterDiff = {
  before: Record<string, any> | null;
  after: Record<string, any> | null;
};

export type PatchOperation = {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
};

export type AuditEventDiff = BeforeAfterDiff | PatchOperation[];

export interface AuditEventMeta {
  reason?: string;
  source?: string;
  confidence?: number;
  ruleId?: string;
  provider?: string;
  fileId?: string;
  rowsCount?: number;
  cell?: {
    row?: number;
    column?: string;
    a1?: string;
  };
  rollbackOf?: string;
  originalAction?: AuditAction;
  [key: string]: any;
}

export interface AuditEvent {
  id: string;
  workspaceId: string | null;
  createdAt: string;
  actorType: ActorType;
  actorId: string | null;
  actorLabel: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  diff: AuditEventDiff | null;
  meta: AuditEventMeta | null;
  batchId: string | null;
  severity: Severity;
  isUndoable: boolean;
}

export interface AuditEventFilter {
  workspaceId?: string;
  entityType?: EntityType;
  entityId?: string;
  actorType?: ActorType;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  batchId?: string;
  severity?: Severity;
  page?: number;
  limit?: number;
}

export interface AuditEventResponse {
  data: AuditEvent[];
  total: number;
  page: number;
  limit: number;
}

export const fetchAuditEvents = async (filter: AuditEventFilter): Promise<AuditEventResponse> => {
  const response = await apiClient.get<AuditEventResponse>('/audit-events', {
    params: filter,
  });
  return response.data;
};

export const fetchEntityHistory = async (
  entityType: EntityType,
  entityId: string,
): Promise<AuditEvent[]> => {
  try {
    const response = await apiClient.get<AuditEvent[]>(
      `/audit-events/entity/${entityType}/${entityId}`,
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 403) {
      return [];
    }
    throw error;
  }
};

export const fetchBatchEvents = async (batchId: string): Promise<AuditEvent[]> => {
  const response = await apiClient.get<AuditEvent[]>(`/audit-events/batch/${batchId}`);
  return response.data;
};

export const rollbackEvent = async (eventId: string) => {
  const response = await apiClient.post(`/audit-events/${eventId}/rollback`);
  return response.data;
};
