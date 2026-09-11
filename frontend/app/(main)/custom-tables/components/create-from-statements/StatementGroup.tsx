'use client';

import { Box } from '@mui/material';
import { Checkbox } from '@/app/components/ui/checkbox';
import type {
  CreateFromStatementsModalLabels,
  FormatLabelFn,
  GroupedOption,
  StatementOption,
} from './types';

interface StatementOptionTextProps {
  option: StatementOption;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
}

function StatementOptionText({
  option,
  labels,
  formatLabel,
}: StatementOptionTextProps): React.JSX.Element {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Box
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--foreground)',
        }}
      >
        {option.title}
      </Box>
      <Box
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 12,
          color: 'var(--muted-foreground)',
        }}
      >
        {labels.sourceLabel}: {option.sourceLabel} - {labels.periodLabel}: {option.periodLabel}
      </Box>
      <Box
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 12,
          color: 'var(--muted-foreground)',
        }}
      >
        {labels.fileLabel}: {option.fileLabel}
      </Box>
      {option.duplicateCount > 1 ? (
        <Box style={{ fontSize: 12, color: 'var(--color-warning-soft-text)' }}>
          {formatLabel({
            template: labels.duplicateUploads,
            values: { count: option.duplicateCount },
          })}
        </Box>
      ) : null}
    </Box>
  );
}

interface StatementGroupItemProps {
  option: StatementOption;
  idx: number;
  checked: boolean;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
}

function StatementGroupItem({
  option,
  idx,
  checked,
  labels,
  formatLabel,
  onToggleStatement,
}: StatementGroupItemProps): React.JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      disabled={option.disabled}
      onClick={() =>
        onToggleStatement({ representativeId: option.representativeId, checked: !checked })
      }
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 1.5,
        py: 1,
        textAlign: 'left',
        border: 'none',
        borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none',
        bgcolor: 'transparent',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        opacity: option.disabled ? 0.5 : 1,
        '&:hover': { bgcolor: option.disabled ? 'transparent' : 'var(--muted)' },
      }}
    >
      <Checkbox checked={checked} className="h-4 w-4" style={{ marginTop: 2, flexShrink: 0 }} />
      <StatementOptionText option={option} labels={labels} formatLabel={formatLabel} />
      <Box style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
        {option.rowsLabel}
      </Box>
    </Box>
  );
}

interface StatementGroupProps {
  group: GroupedOption;
  selectedStatementIds: string[];
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
}

export function StatementGroup({
  group,
  selectedStatementIds,
  labels,
  formatLabel,
  onToggleStatement,
}: StatementGroupProps): React.JSX.Element {
  return (
    <Box sx={{ border: '1px solid var(--border-color)' }}>
      <Box
        sx={{
          borderBottom: '1px solid var(--border-color)',
          bgcolor: 'var(--muted)',
          px: 1.5,
          py: 0.75,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {group.label} ({group.options.length})
      </Box>
      <Box>
        {group.options.map((option, idx) => (
          <StatementGroupItem
            key={option.representativeId}
            option={option}
            idx={idx}
            checked={selectedStatementIds.includes(option.representativeId)}
            labels={labels}
            formatLabel={formatLabel}
            onToggleStatement={onToggleStatement}
          />
        ))}
      </Box>
    </Box>
  );
}
