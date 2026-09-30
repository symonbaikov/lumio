import type { useIntlayer } from '@/app/i18n';
import type { CreateFromStatementsModalLabels } from './components/CreateFromStatementsModal';
import type { CreateTableDialogLabels } from './components/CreateTableDialog';
import { TABLE_TEMPLATES, type TableTemplateId } from './templates';

type Dictionary = ReturnType<typeof useIntlayer<'customTablesPage'>>;

const record = <K extends string>(node: Record<K, { value: string }>, keys: readonly K[]) =>
  Object.fromEntries(keys.map(key => [key, node[key].value])) as Record<K, string>;

export interface ListLabels {
  header: { title: string; subtitle: string };
  actions: Record<
    | 'newTable'
    | 'fromStatements'
    | 'open'
    | 'delete'
    | 'search'
    | 'sourceAll'
    | 'sourceManual'
    | 'caption'
    | 'rowActions',
    string
  >;
  columns: Record<'name' | 'source' | 'category' | 'rows' | 'updated', string>;
  empty: { title: string; description: string };
  toasts: Record<
    | 'loadTablesFailed'
    | 'loadStatementsFailed'
    | 'created'
    | 'createFailed'
    | 'selectAtLeastOneStatement'
    | 'createdFromStatement'
    | 'createFromStatementFailed'
    | 'deleted'
    | 'deleteFailed',
    string
  >;
  create: CreateTableDialogLabels & {
    applying: string;
    partialFailed: string;
    columnTitles: Record<string, string>;
  };
  createFromStatements: CreateFromStatementsModalLabels & { namingHint: string };
  confirmDelete: Record<
    | 'title'
    | 'messageWithNamePrefix'
    | 'messageWithNameSuffix'
    | 'messageNoName'
    | 'confirm'
    | 'cancel',
    string
  >;
}

const templateLabels = (
  t: Dictionary,
): Record<TableTemplateId, { name: string; description: string }> =>
  Object.fromEntries(
    TABLE_TEMPLATES.map(template => [
      template.id,
      {
        name: t.create.templates[template.id].name.value,
        description: t.create.templates[template.id].description.value,
      },
    ]),
  ) as Record<TableTemplateId, { name: string; description: string }>;

const columnTitles = (t: Dictionary): Record<string, string> => {
  const node = t.create.templates.columns as Record<string, { value: string }>;
  return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, item.value]));
};

/** Plain strings for the components: they never see intlayer nodes. */
export function buildListLabels(t: Dictionary): ListLabels {
  const cfs = t.createFromStatements;
  const extra = t.createFromStatementsExtra;
  return {
    header: record(t.header, ['title', 'subtitle']),
    actions: record(t.actions, [
      'newTable',
      'fromStatements',
      'open',
      'delete',
      'search',
      'sourceAll',
      'sourceManual',
      'caption',
      'rowActions',
    ]),
    columns: record(t.columns, ['name', 'source', 'category', 'rows', 'updated']),
    empty: record(t.empty, ['title', 'description']),
    toasts: record(t.toasts, [
      'loadTablesFailed',
      'loadStatementsFailed',
      'created',
      'createFailed',
      'selectAtLeastOneStatement',
      'createdFromStatement',
      'createFromStatementFailed',
      'deleted',
      'deleteFailed',
    ]),
    create: {
      ...record(t.create, [
        'title',
        'name',
        'namePlaceholder',
        'description',
        'descriptionPlaceholder',
        'category',
        'noCategory',
        'creating',
      ]),
      submit: t.createExtra.submit.value,
      cancel: t.createExtra.cancel.value,
      templateLabel: t.createExtra.templateLabel.value,
      columnsCount: t.create.templates.columnsCount.value,
      applying: t.create.templates.applying.value,
      partialFailed: t.create.templates.partialFailed.value,
      blankName: t.create.templates.blank.name.value,
      blankDescription: t.create.templates.blank.description.value,
      templates: templateLabels(t),
      columnTitles: columnTitles(t),
    },
    createFromStatements: {
      ...record(cfs, [
        'title',
        'stepCounter',
        'nameOptional',
        'namePlaceholder',
        'descriptionOptional',
        'descriptionPlaceholder',
        'statementsLoading',
        'statementsEmpty',
        'hint',
        'searchPlaceholder',
        'sourceFilter',
        'sourceAll',
        'groupBy',
        'groupBySource',
        'groupByPeriod',
        'sourceLabel',
        'periodLabel',
        'fileLabel',
        'rowsLabel',
        'selectedLabel',
        'duplicateUploads',
        'noSearchResults',
        'previewTitle',
        'previewSummary',
        'previewRows',
        'previewEditable',
        'next',
        'back',
        'createWithRows',
        'creating',
      ]),
      ...record(extra, [
        'step1',
        'step2',
        'step1Description',
        'step2Description',
        'cancel',
        'create',
        'namingHint',
      ]),
    },
    confirmDelete: record(t.confirmDelete, [
      'title',
      'messageWithNamePrefix',
      'messageWithNameSuffix',
      'messageNoName',
      'confirm',
      'cancel',
    ]),
  };
}
