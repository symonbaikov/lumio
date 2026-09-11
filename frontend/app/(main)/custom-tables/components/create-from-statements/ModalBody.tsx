'use client';

import { Box, DialogContent } from '@mui/material';
import type {
  buildStatementSelectionOptions,
  groupStatementSelectionOptions,
  StatementGroupBy,
} from '../../create-from-statements-utils';
import type { CreateFromStatementsModalLabels, FormatLabelFn } from '../CreateFromStatementsModal';
import { Step1Content } from './Step1Content';
import { Step2Content } from './Step2Content';

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

interface StepIndicatorProps {
  label: string;
  active: boolean;
}

function StepIndicator({ label, active }: StepIndicatorProps): React.JSX.Element {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'var(--border-color)',
        bgcolor: active ? 'primary.50' : 'transparent',
        px: 1.5,
        py: 1,
        fontSize: 12,
        fontWeight: 500,
        color: active ? 'primary.main' : 'var(--muted-foreground)',
      }}
    >
      {label}
    </Box>
  );
}

interface ModalBodyProps {
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
  selectedStatementPreviewItems: StatementOption[];
  namingHintLabel: string;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onSearchChange: (query: string) => void;
  onSourceFilterChange: (source: string) => void;
  onGroupByChange: (groupBy: StatementGroupBy) => void;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
  onFormChange: (patch: Partial<CreateFromStatementsForm>) => void;
}

export function ModalBody({
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
  selectedStatementPreviewItems,
  namingHintLabel,
  labels,
  formatLabel,
  onSearchChange,
  onSourceFilterChange,
  onGroupByChange,
  onToggleStatement,
  onFormChange,
}: ModalBodyProps): React.JSX.Element {
  return (
    <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <StepIndicator label={labels.step1} active={step === 1} />
        <StepIndicator label={labels.step2} active={step === 2} />
      </Box>
      {step === 1 ? (
        <Step1Content
          statementsSearchQuery={statementsSearchQuery}
          statementsSourceFilter={statementsSourceFilter}
          statementsGroupBy={statementsGroupBy}
          statementSourceOptions={statementSourceOptions}
          statementsLoading={statementsLoading}
          statementSelectionOptions={statementSelectionOptions}
          groupedStatementSelectionOptions={groupedStatementSelectionOptions}
          selectedStatementIds={selectedStatementIds}
          selectedStatementSummary={selectedStatementSummary}
          labels={labels}
          formatLabel={formatLabel}
          onSearchChange={onSearchChange}
          onSourceFilterChange={onSourceFilterChange}
          onGroupByChange={onGroupByChange}
          onToggleStatement={onToggleStatement}
        />
      ) : (
        <Step2Content
          form={form}
          namingHintLabel={namingHintLabel}
          selectedStatementSummary={selectedStatementSummary}
          selectedStatementPreviewItems={selectedStatementPreviewItems}
          labels={labels}
          formatLabel={formatLabel}
          onFormChange={onFormChange}
        />
      )}
    </DialogContent>
  );
}
