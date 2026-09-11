'use client';

import { Dialog } from '@mui/material';
import type {
  buildStatementSelectionOptions,
  groupStatementSelectionOptions,
  StatementGroupBy,
} from '../create-from-statements-utils';
import { ModalBody } from './create-from-statements/ModalBody';
import { ModalFooter } from './create-from-statements/ModalFooter';
import { ModalHeader } from './create-from-statements/ModalHeader';

interface SelectedStatementSummary {
  selectedCount: number;
  totalRows: number;
}

interface CreateFromStatementsForm {
  name: string;
  description: string;
}

type StatementOption = ReturnType<typeof buildStatementSelectionOptions>[number];
type GroupedOption = ReturnType<typeof groupStatementSelectionOptions>[number];

export interface CreateFromStatementsModalLabels {
  title: string;
  step1: string;
  step2: string;
  stepCounter: string;
  step1Description: string;
  step2Description: string;
  nameOptional: string;
  namePlaceholder: string;
  descriptionOptional: string;
  descriptionPlaceholder: string;
  statementsLoading: string;
  statementsEmpty: string;
  hint: string;
  searchPlaceholder: string;
  sourceFilter: string;
  sourceAll: string;
  groupBy: string;
  groupBySource: string;
  groupByPeriod: string;
  sourceLabel: string;
  periodLabel: string;
  fileLabel: string;
  rowsLabel: string;
  selectedLabel: string;
  duplicateUploads: string;
  noSearchResults: string;
  previewTitle: string;
  previewSummary: string;
  previewRows: string;
  previewEditable: string;
  next: string;
  back: string;
  createWithRows: string;
  creating: string;
  cancel: string;
  create: string;
}

export type FormatLabelFn = (params: {
  template: string;
  values: Record<string, string | number>;
}) => string;

export interface CreateFromStatementsModalProps {
  open: boolean;
  step: 1 | 2;
  form: CreateFromStatementsForm;
  selectedStatementIds: string[];
  statementsSearchQuery: string;
  statementsSourceFilter: string;
  statementsGroupBy: StatementGroupBy;
  statementSourceOptions: string[];
  statementsLoading: boolean;
  statementSelectionOptions: StatementOption[];
  groupedStatementSelectionOptions: GroupedOption[];
  selectedStatementSummary: SelectedStatementSummary;
  selectedStatementPayloadIds: string[];
  selectedStatementPreviewItems: StatementOption[];
  creatingFromStatements: boolean;
  namingHintLabel: string;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onClose: () => void;
  onStepChange: (step: 1 | 2) => void;
  onFormChange: (patch: Partial<CreateFromStatementsForm>) => void;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
  onSearchChange: (query: string) => void;
  onSourceFilterChange: (source: string) => void;
  onGroupByChange: (groupBy: StatementGroupBy) => void;
  onSubmit: () => void;
}

export function CreateFromStatementsModal({
  open,
  step,
  form,
  selectedStatementIds,
  statementsSearchQuery,
  statementsSourceFilter,
  statementsGroupBy,
  statementSourceOptions,
  statementsLoading,
  statementSelectionOptions,
  groupedStatementSelectionOptions,
  selectedStatementSummary,
  selectedStatementPayloadIds,
  selectedStatementPreviewItems,
  creatingFromStatements,
  namingHintLabel,
  labels,
  formatLabel,
  onClose,
  onStepChange,
  onFormChange,
  onToggleStatement,
  onSearchChange,
  onSourceFilterChange,
  onGroupByChange,
  onSubmit,
}: CreateFromStatementsModalProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { border: '1px solid', borderColor: 'divider' } }}
    >
      <ModalHeader step={step} labels={labels} formatLabel={formatLabel} />
      <ModalBody
        step={step}
        form={form}
        selectedStatementIds={selectedStatementIds}
        statementsSearchQuery={statementsSearchQuery}
        statementsSourceFilter={statementsSourceFilter}
        statementsGroupBy={statementsGroupBy}
        statementSourceOptions={statementSourceOptions}
        statementsLoading={statementsLoading}
        statementSelectionOptions={statementSelectionOptions}
        groupedStatementSelectionOptions={groupedStatementSelectionOptions}
        selectedStatementSummary={selectedStatementSummary}
        selectedStatementPreviewItems={selectedStatementPreviewItems}
        namingHintLabel={namingHintLabel}
        labels={labels}
        formatLabel={formatLabel}
        onSearchChange={onSearchChange}
        onSourceFilterChange={onSourceFilterChange}
        onGroupByChange={onGroupByChange}
        onToggleStatement={onToggleStatement}
        onFormChange={onFormChange}
      />
      <ModalFooter
        step={step}
        selectedStatementSummary={selectedStatementSummary}
        selectedStatementPayloadIds={selectedStatementPayloadIds}
        creatingFromStatements={creatingFromStatements}
        labels={labels}
        formatLabel={formatLabel}
        onClose={onClose}
        onStepChange={onStepChange}
        onSubmit={onSubmit}
      />
    </Dialog>
  );
}
