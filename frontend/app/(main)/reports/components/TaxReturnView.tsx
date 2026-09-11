'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { queryKeys } from '@/app/lib/query-keys';
import { tokens } from '@/lib/theme-tokens';
import {
  exportFileName,
  formatMoney,
  netDirection,
  type PeriodPreset,
  periodFor,
  saveBlob,
  type TaxReturnRecord,
  type TaxReturnTotals,
  type ThresholdStatus,
} from './tax-return.helpers';

const PRESETS: Array<{ key: PeriodPreset; label: string }> = [
  { key: 'thisQuarter', label: 'This quarter' },
  { key: 'lastQuarter', label: 'Last quarter' },
  { key: 'thisYear', label: 'This year' },
];

const DIRECTION_LABEL: Record<string, string> = {
  output: 'Output',
  input: 'Input',
  reverse_charge: 'Reverse charge',
};

function Figure({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}): React.ReactElement {
  return (
    <Box sx={{ minWidth: 160 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
      <Typography
        sx={{ fontSize: emphasis ? 22 : 18, fontWeight: 600, color: 'text.primary', mt: 0.25 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/**
 * The period return: what is owed, what it was built from, and filing it.
 *
 * Filing is irreversible in the sense that matters — it locks every
 * transaction it reports — so the button says what it will do and the
 * reopen path is offered explicitly rather than implied.
 */
export function TaxReturnView(): React.ReactElement {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(() => periodFor('thisQuarter'));
  const [threshold, setThreshold] = useState<ThresholdStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = queryKeys.taxReturn({ workspaceId, ...period });

  const returnQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const query = `periodStart=${period.periodStart}&periodEnd=${period.periodEnd}`;
      const [returnResponse, previewResponse] = await Promise.all([
        apiClient.get<TaxReturnRecord>(`/tax/returns/period?${query}`, { signal }),
        apiClient.get<TaxReturnTotals>(`/tax/returns/preview?${query}`, { signal }),
      ]);
      return { record: returnResponse.data, totals: previewResponse.data };
    },
    // Смена периода не должна стирать цифры: прошлый отчёт виден до прихода
    // нового, но только внутри того же воркспейса.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
  });

  const record = returnQuery.data?.record ?? null;
  const totals = returnQuery.data?.totals ?? null;

  useEffect(() => {
    apiClient
      .get<ThresholdStatus | null>('/tax/settings/threshold')
      .then(response => setThreshold(response.data ?? null))
      .catch(() => setThreshold(null));
  }, []);

  const actMutation = useMutation({
    mutationFn: (action: 'file' | 'reopen') => apiClient.post(`/tax/returns/${action}`, period),
    onSuccess: () => setError(null),
    onError: (_error, action) =>
      setError(
        action === 'file'
          ? 'Could not file the return. Please try again.'
          : 'Could not reopen the period. Please try again.',
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const act = async (action: 'file' | 'reopen') => {
    actMutation.mutate(action);
  };

  const download = async (format: 'pdf' | 'xlsx') => {
    setBusy(true);
    setError(null);

    await (async () => {
      const response = await apiClient.get(
        `/tax/returns/export?periodStart=${period.periodStart}&periodEnd=${period.periodEnd}&format=${format}`,
        { responseType: 'blob' },
      );
      saveBlob(response.data as Blob, exportFileName(period.periodStart, period.periodEnd, format));
    })()
      .catch(async () => {
        setError(`Could not export the return as ${format.toUpperCase()}.`);
      })
      .finally(async () => {
        setBusy(false);
      });
  };

  const isFiled = record?.status === 'filed';
  const currency = totals?.currency ?? record?.currency ?? '';

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {PRESETS.map(preset => (
          <Button
            key={preset.key}
            size="small"
            variant="outlined"
            onClick={() => setPeriod(periodFor(preset.key))}
            sx={{ borderRadius: tokens.radius.md, textTransform: 'none' }}
          >
            {preset.label}
          </Button>
        ))}
        <TextField
          size="small"
          type="date"
          label="From"
          value={period.periodStart}
          onChange={event => setPeriod(p => ({ ...p, periodStart: event.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={period.periodEnd}
          onChange={event => setPeriod(p => ({ ...p, periodEnd: event.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      {error || returnQuery.isError ? (
        <Alert severity="error">
          {error ?? 'Could not build the return. Check that this workspace has a tax jurisdiction.'}
        </Alert>
      ) : null}

      {threshold?.threshold ? (
        <Box
          sx={{
            borderRadius: tokens.radius.lg,
            border: '1px solid',
            borderColor: 'divider',
            p: 2,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
            Registration threshold
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {formatMoney(threshold.turnover, threshold.currency)} of{' '}
            {formatMoney(threshold.threshold, threshold.currency)} —{' '}
            {Math.round(threshold.percentUsed)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, threshold.percentUsed)}
            color={
              threshold.percentUsed >= 100
                ? 'error'
                : threshold.percentUsed >= 80
                  ? 'warning'
                  : 'primary'
            }
            sx={{ mt: 1, borderRadius: 999, height: 6 }}
          />
        </Box>
      ) : null}

      {returnQuery.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        // Фоновая перезагрузка после смены периода или подачи только приглушает.
        <Box
          sx={{
            opacity: returnQuery.isFetching ? 0.6 : 1,
            transition: 'opacity 150ms ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          <Stack
            direction="row"
            spacing={3}
            sx={{
              flexWrap: 'wrap',
              gap: 2,
              borderRadius: tokens.radius.lg,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: { xs: 2, sm: 3 },
            }}
          >
            <Figure label="Output tax" value={formatMoney(totals?.outputTax ?? 0, currency)} />
            <Figure label="Input tax" value={formatMoney(totals?.inputTax ?? 0, currency)} />
            <Figure
              label={netDirection(totals?.netPayable ?? 0) === 'refund' ? 'Reclaimable' : 'Payable'}
              value={formatMoney(Math.abs(Number(totals?.netPayable ?? 0)), currency)}
              emphasis
            />
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                size="small"
                label={isFiled ? 'Filed' : 'Draft'}
                color={isFiled ? 'success' : 'default'}
              />
              <Button
                variant="outlined"
                disabled={busy || actMutation.isPending}
                onClick={() => download('pdf')}
                sx={{ borderRadius: tokens.radius.md, textTransform: 'none', fontWeight: 600 }}
              >
                PDF
              </Button>
              <Button
                variant="outlined"
                disabled={busy || actMutation.isPending}
                onClick={() => download('xlsx')}
                sx={{ borderRadius: tokens.radius.md, textTransform: 'none', fontWeight: 600 }}
              >
                XLSX
              </Button>
              <Button
                variant={isFiled ? 'outlined' : 'contained'}
                disabled={busy || actMutation.isPending}
                onClick={() => act(isFiled ? 'reopen' : 'file')}
                sx={{ borderRadius: tokens.radius.md, textTransform: 'none', fontWeight: 600 }}
              >
                {isFiled ? 'Reopen period' : 'File and lock'}
              </Button>
            </Box>
          </Stack>

          {isFiled ? (
            <Alert severity="info">
              This period is filed. The transactions behind it are locked, and the figures shown are
              the ones that were submitted.
            </Alert>
          ) : null}

          {totals && totals.lines.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Counterparty</TableCell>
                    <TableCell>Kind</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">In {currency}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {totals.lines.map(line => (
                    <TableRow key={line.transactionId}>
                      <TableCell>{line.date}</TableCell>
                      <TableCell>{line.counterparty}</TableCell>
                      <TableCell>{DIRECTION_LABEL[line.direction] ?? line.direction}</TableCell>
                      <TableCell align="right">
                        {formatMoney(line.taxAmount, line.currency)}
                      </TableCell>
                      <TableCell align="right">
                        {line.exchangeRate === 1 ? '—' : line.exchangeRate}
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(line.taxAmountConverted, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              No taxed transactions in this period.
            </Typography>
          )}
        </Box>
      )}

      <Typography
        sx={{
          fontSize: 12,
          lineHeight: 1.6,
          color: 'text.secondary',
          borderTop: '1px solid',
          borderColor: 'divider',
          pt: 1.5,
        }}
      >
        These figures are produced from your own data using rates we maintain, and are not a
        substitute for advice from an accountant. Check them before submitting anything.
      </Typography>
    </Stack>
  );
}
