'use client';

import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import { formatLineRef, linesForCategory, suggestionEntries } from '../tax-declaration.helpers';
import type { MappingEntry, MappingStatus, MappingsResponse } from '../tax-declaration.types';

const STATUS_COLOR: Record<MappingStatus, 'success' | 'warning' | 'default'> = {
  confirmed: 'success',
  suggested: 'warning',
  unmapped: 'default',
};

interface MappingStepProps {
  mappings: MappingsResponse;
  saving: boolean;
  onSave: (entries: MappingEntry[]) => void;
}

/**
 * Category → form line. A suggestion is shown in the select but stays a
 * suggestion until the user saves it; only confirmed lines reach the draft.
 */
export function MappingStep({ mappings, saving, onSave }: MappingStepProps): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const suggestions = suggestionEntries(mappings.categories);
  const statusLabel: Record<MappingStatus, React.ReactNode> = {
    confirmed: t.statusConfirmed,
    suggested: t.statusSuggested,
    unmapped: t.statusUnmapped,
  };

  // Categories that actually carry transactions this year come first.
  const categories = [...mappings.categories].sort(
    (a, b) => b.transactionCount - a.transactionCount || a.name.localeCompare(b.name),
  );

  return (
    <Stack spacing={2}>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', maxWidth: 820 }}>
        {t.mappingIntro}
      </Typography>

      <Box>
        <Button
          variant="outlined"
          disabled={suggestions.length === 0 || saving}
          onClick={() => onSave(suggestions)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t.acceptSuggestions} ({suggestions.length})
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t.mappingCategory}</TableCell>
              <TableCell align="right">{t.transactionsLabel}</TableCell>
              <TableCell>{t.mappingLine}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category.categoryId}>
                <TableCell>{category.name}</TableCell>
                <TableCell align="right">{category.transactionCount}</TableCell>
                <TableCell sx={{ minWidth: 300 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    disabled={saving}
                    value={category.lineKey ?? ''}
                    SelectProps={{ displayEmpty: true }}
                    inputProps={{ 'aria-label': `${t.mappingLine.value}: ${category.name}` }}
                    onChange={event =>
                      onSave([
                        { categoryId: category.categoryId, lineKey: event.target.value || null },
                      ])
                    }
                  >
                    <MenuItem value="">{t.notAssigned}</MenuItem>
                    {linesForCategory(mappings.lines, category.type).map(line => (
                      <MenuItem key={line.key} value={line.key}>
                        {line.lineNo ? `${formatLineRef(line.lineNo, line.fieldNo)} — ` : ''}
                        {line.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Chip
                    size="small"
                    label={statusLabel[category.status]}
                    color={STATUS_COLOR[category.status]}
                  />
                  {category.status === 'suggested' && category.lineKey ? (
                    <Button
                      size="small"
                      disabled={saving}
                      onClick={() =>
                        onSave([{ categoryId: category.categoryId, lineKey: category.lineKey }])
                      }
                      sx={{ ml: 1, textTransform: 'none' }}
                    >
                      {t.save}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
