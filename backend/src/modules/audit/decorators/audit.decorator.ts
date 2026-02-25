import { SetMetadata } from '@nestjs/common';
import type { EntityType, Severity } from '../../../entities/audit-event.entity';

export const AUDIT_METADATA_KEY = 'audit:metadata';

export interface AuditOptions {
  includeBody?: boolean;
  includeDiff?: boolean;
  isUndoable?: boolean;
  severity?: Severity;
}

export type AuditMetadataInput = { entityType: EntityType } & AuditOptions;

export function Audit(
  entityType: EntityType,
  options?: AuditOptions,
): ReturnType<typeof SetMetadata>;
export function Audit(options: AuditMetadataInput): ReturnType<typeof SetMetadata>;
export function Audit(
  entityTypeOrOptions: EntityType | AuditMetadataInput,
  options: AuditOptions = {},
): ReturnType<typeof SetMetadata> {
  if (typeof entityTypeOrOptions === 'object' && entityTypeOrOptions !== null) {
    return SetMetadata(AUDIT_METADATA_KEY, { ...entityTypeOrOptions });
  }
  return SetMetadata(AUDIT_METADATA_KEY, { entityType: entityTypeOrOptions, ...options });
}
