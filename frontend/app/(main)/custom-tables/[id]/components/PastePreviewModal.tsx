'use client';

import { Box, Typography } from '@mui/material';
import { Checkbox } from '@/app/components/ui/checkbox';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { Spinner } from '@/app/components/ui/spinner';
import type { PasteErrorKey, PastePreviewData, PastePreviewRow } from '../utils/pasteUtils';
import { tx } from '../utils/tableHelpers';

// ---------------------------------------------------------------------------
// Sub-components extracted to reduce cognitive complexity
// ---------------------------------------------------------------------------

function PasteTableCell({
  cell,
  rowIndex,
  onCellChange,
}: {
  cell: PastePreviewRow['cells'][number];
  rowIndex: number;
  onCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
}) {
  const bgColor = cell.error ? 'var(--color-error-soft-bg)' : 'transparent';
  const textColor = cell.error ? '#b91c1c' : 'var(--foreground)';

  return (
    <td
      style={{
        padding: '8px 12px',
        borderRight: '1px solid var(--muted)',
        background: bgColor,
        color: textColor,
      }}
    >
      {cell.sourceIndex !== null ? (
        <input
          value={cell.value}
          onChange={event => onCellChange(rowIndex, cell.sourceIndex as number, event.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            outline: 'none',
            fontSize: 14,
            color: textColor,
          }}
        />
      ) : (
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cell.value || '\u2014'}
        </div>
      )}
    </td>
  );
}

interface PastePreviewModalProps {
  t: unknown;
  isOpen: boolean;
  onClose: () => void;
  pasteApplying: boolean;
  pasteParsing: boolean;
  pastePreview: PastePreviewData | null;
  pasteUseHeaders: boolean;
  hasMissingPasteColumnTitles: boolean;
  onHeadersToggle: (checked: boolean) => void;
  onCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
  onConfirm: () => Promise<void>;
}

export function PastePreviewModal({
  t,
  isOpen,
  onClose,
  pasteApplying,
  pasteParsing,
  pastePreview,
  pasteUseHeaders,
  hasMissingPasteColumnTitles,
  onHeadersToggle,
  onCellChange,
  onConfirm,
}: PastePreviewModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={!pasteApplying}
      closeOnBackdropClick={!pasteApplying}
      closeOnEscape={!pasteApplying}
      contentSx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0, gap: 0 }}
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: 'var(--foreground)',
            }}
          >
            {pastePreview
              ? `${tx(t, ['paste', 'titlePrefix'], '')}${pastePreview.totalRows}${tx(t, ['paste', 'titleSuffix'], '')}`
              : tx(t, ['paste', 'titleFallback'], 'Paste preview')}
          </Typography>
          {pastePreview?.hasHeadersToggle && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                bgcolor: 'var(--muted)',
                px: 1.5,
                py: 0.75,
                border: '1px solid var(--border-color)',
              }}
            >
              <Checkbox
                checked={pasteUseHeaders}
                onCheckedChange={onHeadersToggle}
                className="h-4 w-4"
              />
              <span>{tx(t, ['paste', 'headersToggle'], 'Use first row as headers')}</span>
            </Box>
          )}
        </Box>
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          cancelText={tx(t, ['paste', 'cancel'], 'Cancel')}
          confirmText={tx(t, ['paste', 'add'], 'Add')}
          isConfirmLoading={pasteApplying}
          isConfirmDisabled={
            pasteParsing ||
            !pastePreview?.dataRows.length ||
            Boolean(pastePreview?.hasErrors) ||
            hasMissingPasteColumnTitles
          }
        />
      }
    >
      {pasteParsing && (
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <Spinner className="h-6 w-6 text-primary" />
          <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            {tx(t, ['paste', 'parsing'], 'Parsing...')}
          </Typography>
        </Box>
      )}
      {!pasteParsing && pastePreview && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {pastePreview.hasErrors && (
            <Box
              sx={{
                flexShrink: 0,
                px: 3,
                py: 1.5,
                borderBottom: '1px solid var(--muted)',
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  border: '1px solid var(--color-warning-soft-border)',
                  bgcolor: 'var(--color-warning-soft-bg)',
                  p: 1.5,
                }}
              >
                <Typography
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-warning-soft-text)',
                    whiteSpace: 'nowrap',
                    paddingTop: 2,
                  }}
                >
                  {tx(t, ['paste', 'errorsTitle'], 'Errors')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, rowGap: 0.25 }}>
                  {(['date', 'amount', 'currency', 'paid'] as PasteErrorKey[])
                    .filter(key => pastePreview.errors[key] > 0)
                    .map(key => (
                      <Box
                        key={key}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: 'rgba(251,191,36,0.2)',
                          px: 1,
                          py: 0.25,
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--color-warning-soft-text)',
                        }}
                      >
                        <span>{tx(t, ['paste', 'errors', key], key)}:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {pastePreview.errors[key]}
                        </span>
                      </Box>
                    ))}
                </Box>
              </Box>
            </Box>
          )}

          <Box sx={{ flex: 1, position: 'relative', bgcolor: 'rgba(249,250,251,0.3)' }}>
            {pastePreview.totalRows === 0 ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted-foreground)',
                }}
              >
                {tx(t, ['paste', 'noRows'], 'No rows found')}
              </Box>
            ) : (
              <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      background: 'var(--card-bg)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <tr>
                      {pastePreview.columns.map(col => (
                        <th
                          key={`${col.field}-${col.columnKey}`}
                          style={{
                            padding: '12px',
                            textAlign: 'left',
                            minWidth: 180,
                            borderRight: '1px solid var(--muted)',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ background: 'var(--card-bg)' }}>
                    {pastePreview.previewRows.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--muted)' }}>
                        {row.cells.map((cell, index) => (
                          <PasteTableCell
                            key={`${row.id}-${index}`}
                            cell={cell}
                            rowIndex={row.rowIndex}
                            onCellChange={onCellChange}
                          />
                        ))}
                      </tr>
                    ))}
                    {pastePreview.extraRowsCount > 0 && (
                      <tr>
                        <td
                          colSpan={pastePreview.columns.length}
                          style={{
                            padding: '24px',
                            textAlign: 'center',
                            fontSize: 12,
                            color: 'var(--muted-foreground)',
                            background: 'rgba(249,250,251,0.3)',
                          }}
                        >
                          {tx(t, ['paste', 'moreRowsPrefix'], '')}
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              margin: '0 4px',
                            }}
                          >
                            {pastePreview.extraRowsCount}
                          </span>
                          {tx(t, ['paste', 'moreRowsSuffix'], '')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </ModalShell>
  );
}
