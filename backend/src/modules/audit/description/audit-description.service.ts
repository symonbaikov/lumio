import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  type AuditEventDiff,
  EntityType,
} from '../../../entities/audit-event.entity';
import type { CreateAuditEventDto } from '../interfaces/audit-event.interface';

const ENTITY_LABELS: Record<EntityType, string> = {
  [EntityType.TRANSACTION]: 'транзакция',
  [EntityType.STATEMENT]: 'выписка',
  [EntityType.RECEIPT]: 'чек',
  [EntityType.PAYABLE]: 'задолженность',
  [EntityType.CATEGORY]: 'категория',
  [EntityType.RULE]: 'правило',
  [EntityType.WORKSPACE]: 'рабочее пространство',
  [EntityType.INTEGRATION]: 'интеграция',
  [EntityType.TABLE_ROW]: 'строка таблицы',
  [EntityType.TABLE_CELL]: 'ячейка таблицы',
  [EntityType.BRANCH]: 'филиал',
  [EntityType.WALLET]: 'кошелек',
  [EntityType.CUSTOM_TABLE]: 'таблица',
  [EntityType.CUSTOM_TABLE_COLUMN]: 'колонка таблицы',
  [EntityType.BUDGET]: 'бюджет',
  [EntityType.SUBSCRIPTION]: 'подписка',
};

const ENTITY_GENITIVE_LABELS: Partial<Record<EntityType, string>> = {
  [EntityType.CATEGORY]: 'категории',
  [EntityType.WORKSPACE]: 'рабочего пространства',
  [EntityType.CUSTOM_TABLE]: 'таблицы',
  [EntityType.CUSTOM_TABLE_COLUMN]: 'колонки таблицы',
  [EntityType.TRANSACTION]: 'транзакции',
  [EntityType.STATEMENT]: 'выписки',
};

const FIELD_LABELS: Partial<Record<EntityType, Record<string, string>>> = {
  [EntityType.WORKSPACE]: {
    name: 'название рабочего пространства',
    description: 'описание рабочего пространства',
    icon: 'иконка рабочего пространства',
    color: 'цвет рабочего пространства',
    backgroundImage: 'фоновое изображение рабочего пространства',
    currency: 'валюта рабочего пространства',
    isFavorite: 'избранное рабочего пространства',
    settings: 'настройки рабочего пространства',
  },
  [EntityType.CUSTOM_TABLE]: {
    name: 'название таблицы',
    description: 'описание таблицы',
    source: 'источник таблицы',
    categoryId: 'категория таблицы',
    viewSettings: 'настройки представления таблицы',
    dataEntryType: 'тип данных таблицы',
    dataEntryScope: 'область ввода данных',
  },
  [EntityType.CUSTOM_TABLE_COLUMN]: {
    title: 'название колонки',
    type: 'тип колонки',
    isRequired: 'обязательность колонки',
    isUnique: 'уникальность колонки',
    position: 'порядок колонок',
    config: 'настройки колонки',
    key: 'ключ колонки',
  },
  [EntityType.CATEGORY]: {
    name: 'название категории',
    color: 'цвет категории',
    icon: 'иконка категории',
    source: 'источник категории',
  },
  [EntityType.TRANSACTION]: {
    amount: 'сумма транзакции',
    description: 'описание транзакции',
    categoryId: 'категория транзакции',
    transactionDate: 'дата транзакции',
    status: 'статус транзакции',
  },
};

const TECHNICAL_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'workspaceId',
  'userId',
  'ownerId',
  'deletedAt',
  'lastAccessedAt',
  'accessCount',
]);

@Injectable()
export class AuditDescriptionService {
  generate(dto: CreateAuditEventDto): string {
    switch (dto.action) {
      case AuditAction.CREATE:
        return this.describeCreate(dto);
      case AuditAction.UPDATE:
        return this.describeUpdate(dto);
      case AuditAction.DELETE:
        return this.describeDelete(dto);
      case AuditAction.ROLLBACK:
        return this.describeRollback(dto);
      case AuditAction.IMPORT:
        return this.describeImport(dto);
      case AuditAction.LINK:
        return `Связано: ${this.getEntityLabel(dto.entityType)}`;
      case AuditAction.UNLINK:
        return `Отключено: ${this.getEntityLabel(dto.entityType)}`;
      case AuditAction.MATCH:
        return `Сопоставлено: ${this.getEntityLabel(dto.entityType)}`;
      case AuditAction.UNMATCH:
        return `Снято сопоставление: ${this.getEntityLabel(dto.entityType)}`;
      case AuditAction.APPLY_RULE:
        return `Применено правило к ${this.getEntityLabel(dto.entityType)}`;
      case AuditAction.EXPORT:
        return `Экспортировано: ${this.getEntityLabel(dto.entityType)}`;
      default:
        return `${dto.action} ${this.getEntityLabel(dto.entityType)}`;
    }
  }

  private describeCreate(dto: CreateAuditEventDto): string {
    const entityLabel = this.getEntityLabel(dto.entityType);
    const name = this.getEntityName(dto.diff, dto.meta);

    if (name) {
      return `Создана ${entityLabel} "${name}"`;
    }

    return `Создана ${entityLabel}`;
  }

  private describeUpdate(dto: CreateAuditEventDto): string {
    const changedFields = this.getChangedFields(dto.diff, dto.entityType);
    if (changedFields.length === 1) {
      return `Изменено: ${changedFields[0]}`;
    }

    if (changedFields.length > 1) {
      const visibleFields = changedFields.slice(0, 3).join(', ');
      const suffix = changedFields.length > 3 ? ` и еще ${changedFields.length - 3}` : '';
      return `Изменена ${this.getEntityLabel(dto.entityType)}: ${visibleFields}${suffix}`;
    }

    return `Изменена ${this.getEntityLabel(dto.entityType)}`;
  }

  private describeDelete(dto: CreateAuditEventDto): string {
    const entityLabel = this.getEntityLabel(dto.entityType);
    const name = this.getEntityName(dto.diff, dto.meta);

    if (name) {
      return `Удалена ${entityLabel} "${name}"`;
    }

    return `Удалена ${entityLabel}`;
  }

  private describeRollback(dto: CreateAuditEventDto): string {
    const originalAction = dto.meta?.originalAction;
    if (originalAction === AuditAction.UPDATE) {
      return `Откат: изменение ${this.getEntityGenitiveLabel(dto.entityType)}`;
    }
    if (originalAction === AuditAction.DELETE) {
      return `Откат: удаление ${this.getEntityGenitiveLabel(dto.entityType)}`;
    }
    if (originalAction === AuditAction.CREATE) {
      return `Откат: создание ${this.getEntityGenitiveLabel(dto.entityType)}`;
    }

    return `Откат: ${this.getEntityLabel(dto.entityType)}`;
  }

  private describeImport(dto: CreateAuditEventDto): string {
    const source = dto.meta?.source || dto.meta?.provider;
    const rowsCount = typeof dto.meta?.rowsCount === 'number' ? dto.meta.rowsCount : null;
    if (source && rowsCount) {
      return `Импортировано из ${source}: ${rowsCount} записей`;
    }
    if (source) {
      return `Импортировано из ${source}`;
    }

    return `Импортирована ${this.getEntityLabel(dto.entityType)}`;
  }

  private getChangedFields(diff: AuditEventDiff | null | undefined, entityType: EntityType): string[] {
    if (!diff || Array.isArray(diff)) {
      return [];
    }

    const before = diff.before ?? {};
    const after = diff.after ?? {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    return keys
      .filter(key => !TECHNICAL_FIELDS.has(key))
      .filter(key => JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify((after as Record<string, unknown>)[key]))
      .map(key => this.getFieldLabel(entityType, key));
  }

  private getEntityName(diff: AuditEventDiff | null | undefined, meta?: Record<string, unknown> | null): string | null {
    if (meta?.name && typeof meta.name === 'string') {
      return meta.name;
    }

    if (!diff || Array.isArray(diff)) {
      return null;
    }

    const candidate = diff.after ?? diff.before;
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const name = (candidate as Record<string, unknown>).name;
    const title = (candidate as Record<string, unknown>).title;
    const label = (candidate as Record<string, unknown>).label;

    if (typeof name === 'string' && name.trim()) return name.trim();
    if (typeof title === 'string' && title.trim()) return title.trim();
    if (typeof label === 'string' && label.trim()) return label.trim();

    return null;
  }

  private getFieldLabel(entityType: EntityType, field: string): string {
    return FIELD_LABELS[entityType]?.[field] ?? field;
  }

  private getEntityLabel(entityType: EntityType): string {
    return ENTITY_LABELS[entityType] ?? entityType;
  }

  private getEntityGenitiveLabel(entityType: EntityType): string {
    return ENTITY_GENITIVE_LABELS[entityType] ?? this.getEntityLabel(entityType);
  }
}
