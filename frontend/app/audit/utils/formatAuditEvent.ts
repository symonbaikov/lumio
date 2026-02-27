import type { AuditAction, AuditEvent, EntityType, Severity } from '@/lib/api/audit';

type ActionTone = 'info' | 'warn' | 'critical' | 'primary' | 'success';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Change',
  delete: 'Delete',
  import: 'Import',
  link: 'Link',
  unlink: 'Unlink',
  match: 'Match',
  unmatch: 'Unmatch',
  apply_rule: 'Apply Rule',
  rollback: 'Rollback',
  export: 'Export',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  transaction: 'Transaction',
  statement: 'Statement',
  receipt: 'Receipt',
  category: 'Category',
  rule: 'Rule',
  workspace: 'Workspace',
  integration: 'Integration',
  table_row: 'Table Row',
  table_cell: 'Table Cell',
  branch: 'Branch',
  wallet: 'Wallet',
  custom_table: 'Custom Table',
  custom_table_column: 'Custom Table Column',
};

const ACTION_TONES: Record<AuditAction, ActionTone> = {
  create: 'success',
  update: 'primary',
  delete: 'critical',
  import: 'info',
  link: 'info',
  unlink: 'warn',
  match: 'info',
  unmatch: 'warn',
  apply_rule: 'primary',
  rollback: 'warn',
  export: 'info',
};

const SEVERITY_TONES: Record<Severity, ActionTone> = {
  info: 'info',
  warn: 'warn',
  critical: 'critical',
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const extractDescriptionLines = (event: AuditEvent): string[] => {
  const diff = event.diff;
  if (!diff || Array.isArray(diff)) {
    return [`${ENTITY_LABELS[event.entityType]} ${event.entityId}`];
  }

  const before = diff.before ?? {};
  const after = diff.after ?? {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  if (keys.length === 0) {
    return [`${ENTITY_LABELS[event.entityType]} ${event.entityId}`];
  }

  const key = keys[0];
  const beforeValue = formatValue((before as Record<string, unknown>)[key]);
  const afterValue = formatValue((after as Record<string, unknown>)[key]);

  return [`From: ${beforeValue}`, `To: ${afterValue}`];
};

export const formatAuditEvent = (event: AuditEvent) => {
  const actionLabel = ACTION_LABELS[event.action] ?? event.action;
  const objectLabel = ENTITY_LABELS[event.entityType] ?? event.entityType;
  const descriptionLines = extractDescriptionLines(event);
  const actionTone = SEVERITY_TONES[event.severity] ?? ACTION_TONES[event.action] ?? 'info';

  return {
    actionLabel,
    objectLabel,
    descriptionLines,
    severity: event.severity,
    actionTone,
  };
};
