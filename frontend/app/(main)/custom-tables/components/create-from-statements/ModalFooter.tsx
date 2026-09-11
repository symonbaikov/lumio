'use client';

import { Box, Button, DialogActions } from '@mui/material';
import type { CreateFromStatementsModalLabels, FormatLabelFn } from '../CreateFromStatementsModal';

interface SelectedStatementSummary {
  selectedCount: number;
  totalRows: number;
}

interface ModalFooterProps {
  step: 1 | 2;
  selectedStatementSummary: SelectedStatementSummary;
  selectedStatementPayloadIds: string[];
  creatingFromStatements: boolean;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onClose: () => void;
  onStepChange: (step: 1 | 2) => void;
  onSubmit: () => void;
}

export function ModalFooter({
  step,
  selectedStatementSummary,
  selectedStatementPayloadIds,
  creatingFromStatements,
  labels,
  formatLabel,
  onClose,
  onStepChange,
  onSubmit,
}: ModalFooterProps): React.JSX.Element {
  const createLabel = creatingFromStatements
    ? labels.creating
    : selectedStatementSummary.totalRows > 0
      ? formatLabel({
          template: labels.createWithRows,
          values: { rows: selectedStatementSummary.totalRows },
        })
      : labels.create;

  return (
    <DialogActions sx={{ gap: 1, borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
      <Button onClick={onClose} type="button">
        {labels.cancel}
      </Button>
      {step === 1 ? (
        <Button
          variant="contained"
          disabled={!selectedStatementSummary.selectedCount}
          onClick={() => onStepChange(2)}
          type="button"
        >
          {labels.next}
        </Button>
      ) : (
        <Box sx={{ display: 'contents' }}>
          <Button onClick={() => onStepChange(1)} type="button">
            {labels.back}
          </Button>
          <Button
            variant="contained"
            disabled={!selectedStatementPayloadIds.length || creatingFromStatements}
            onClick={onSubmit}
            type="button"
          >
            {createLabel}
          </Button>
        </Box>
      )}
    </DialogActions>
  );
}
