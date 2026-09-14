'use client';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type React from 'react';
import { type ReactNode, useState } from 'react';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import { formatLineRef } from '../tax-declaration.helpers';
import type { DraftFigure, IncomeTaxDraft } from '../tax-declaration.types';

function warningKey(warning: IncomeTaxDraft['warnings'][number]): string {
  return `${warning.code}-${warning.lineKey ?? ''}-${String(warning.params?.recipient ?? '')}`;
}

export function DraftStep({ draft }: { draft: IncomeTaxDraft }): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const { locale } = useLocale();
  const [openFigure, setOpenFigure] = useState<DraftFigure | null>(null);
  const warningLabels = t.warnings as unknown as Record<string, ReactNode>;
  const money = (value: number, currency = draft.currency): string =>
    formatMoney(value, currency, locale);

  const contributions = openFigure ? (draft.contributions[openFigure.key] ?? []) : [];

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
          {draft.pack.name} · {draft.country.name} · {draft.taxYear}
        </Typography>
        {draft.pack.isGeneric ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t.genericNotice}
          </Alert>
        ) : null}
      </Box>

      {draft.warnings.length > 0 ? (
        <Alert severity="warning">
          <AlertTitle>{t.warningsTitle}</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {draft.warnings.map(warning => (
              <li key={warningKey(warning)}>
                {warningLabels[warning.code] ?? warning.code}
                {warning.params?.recipient ? ` (${String(warning.params.recipient)})` : ''}
              </li>
            ))}
          </Box>
        </Alert>
      ) : null}

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t.draftLine}</TableCell>
              <TableCell>{t.draftDescription}</TableCell>
              <TableCell align="right">{t.draftBooked}</TableCell>
              <TableCell align="right">{t.draftDeductible}</TableCell>
              <TableCell align="right">{t.transactionsLabel}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {draft.figures.map(figure => {
              const emphasis = figure.section === 'total' || figure.section === 'result';
              return (
                <TableRow
                  key={figure.key}
                  sx={{
                    bgcolor: figure.section === 'result' ? 'action.hover' : undefined,
                    '& td': { fontWeight: emphasis ? 600 : 400 },
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatLineRef(figure.lineNo, figure.fieldNo)}
                  </TableCell>
                  <TableCell>{figure.label}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {money(figure.amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {money(figure.deductible)}
                  </TableCell>
                  <TableCell align="right">
                    {figure.transactionCount > 0 ? (
                      <Button size="small" onClick={() => setOpenFigure(figure)}>
                        {figure.transactionCount}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
        {draft.fxRule === 'nbp_previous_business_day' ? t.fxNbp : t.fxTransactionDate}
      </Typography>

      {draft.taxEstimate ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: tokens.radius.md,
            p: 2,
            maxWidth: 720,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
            {t.estimateTitle}: {money(draft.taxEstimate.amount)}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {draft.taxEstimate.basis}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {t.estimateNotIncluded} {draft.taxEstimate.excludes.join('; ')}
          </Typography>
        </Box>
      ) : null}

      <Dialog
        open={openFigure !== null}
        onClose={() => setOpenFigure(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t.lineTransactionsTitle}: {openFigure?.label}
        </DialogTitle>
        <DialogContent sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t.colDate}</TableCell>
                <TableCell>{t.colCounterparty}</TableCell>
                <TableCell align="right">{t.colAmount}</TableCell>
                <TableCell align="right">{draft.currency}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contributions.map(row => (
                <TableRow key={row.transactionId}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.date}</TableCell>
                  <TableCell>{row.counterparty}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {money(row.amount, row.currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {money(row.amountConverted)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFigure(null)}>{t.close}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
