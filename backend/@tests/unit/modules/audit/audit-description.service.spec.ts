import { AuditAction, EntityType } from '@/entities/audit-event.entity';
import {
  AuditDescriptionService,
  renderAuditDescriptionEnglish,
} from '@/modules/audit/description/audit-description.service';
import type { CreateAuditEventDto } from '@/modules/audit/interfaces/audit-event.interface';

describe('AuditDescriptionService', () => {
  const service = new AuditDescriptionService();

  it('describes custom table creation with entity name', () => {
    const descriptor = service.generate({
      entityType: EntityType.CUSTOM_TABLE,
      entityId: 'table-1',
      action: AuditAction.CREATE,
      diff: {
        before: null,
        after: { id: 'table-1', name: 'Fish Dream product table' },
      },
    } as CreateAuditEventDto);

    expect(descriptor).toEqual({
      key: 'createNamed',
      params: { entity: EntityType.CUSTOM_TABLE, name: 'Fish Dream product table' },
    });
    expect(renderAuditDescriptionEnglish(descriptor)).toBe(
      'Created: table "Fish Dream product table"',
    );
  });

  it('reports the raw field key so clients can label it in their own locale', () => {
    const descriptor = service.generate({
      entityType: EntityType.WORKSPACE,
      entityId: 'workspace-1',
      action: AuditAction.UPDATE,
      diff: {
        before: { backgroundImage: null },
        after: { backgroundImage: 'hero.jpg' },
      },
    } as CreateAuditEventDto);

    expect(descriptor).toEqual({
      key: 'updateOneField',
      params: { entity: EntityType.WORKSPACE, field: 'backgroundImage' },
    });
    expect(renderAuditDescriptionEnglish(descriptor)).toBe(
      'Changed: workspace background image',
    );
  });

  it('describes rollback using original action context', () => {
    const descriptor = service.generate({
      entityType: EntityType.CATEGORY,
      entityId: 'category-1',
      action: AuditAction.ROLLBACK,
      meta: { originalAction: AuditAction.UPDATE },
      diff: {
        before: { name: 'Office' },
        after: { name: 'Marketing' },
      },
    } as CreateAuditEventDto);

    expect(descriptor).toEqual({
      key: 'rollbackUpdate',
      params: { entity: EntityType.CATEGORY },
    });
    expect(renderAuditDescriptionEnglish(descriptor)).toBe('Rolled back: change to category');
  });

  it('truncates a long field list and reports the remainder', () => {
    const descriptor = service.generate({
      entityType: EntityType.CUSTOM_TABLE,
      entityId: 'table-1',
      action: AuditAction.UPDATE,
      diff: {
        before: { name: 'a', description: 'a', source: 'a', categoryId: 'a' },
        after: { name: 'b', description: 'b', source: 'b', categoryId: 'b' },
      },
    } as CreateAuditEventDto);

    expect(descriptor.key).toBe('updateManyFieldsMore');
    expect(descriptor.params.more).toBe(1);
    expect(renderAuditDescriptionEnglish(descriptor)).toBe(
      'Changed table: table name, table description, table source and 1 more',
    );
  });
});
