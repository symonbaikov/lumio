'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { Select } from '@/app/components/ui/select';
import { Spinner } from '@/app/components/ui/spinner';
import type { UsePasteImportReturn } from '../hooks/usePasteImport';
import type { PasteColumnMapping, PasteMappingSelection } from '../utils/pasteTypes';
import type { CustomTableColumn } from '../utils/types';

export interface ImportPreviewLabels {
  title: string;
  useHeaders: string;
  ignore: string;
  newColumn: string;
  newColumnTitle: string;
  rowsSummary: string;
  extraRows: string;
  errors: string;
  add: string;
  cancel: string;
  source: string;
  target: string;
}

interface ImportPreviewDialogProps {
  paste: UsePasteImportReturn;
  columns: CustomTableColumn[];
  labels: ImportPreviewLabels;
}

const fill = (template: string, vars: Record<string, number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)), template);

const NEW = '__new__';
const IGNORE = '__ignore__';

const selectionValue = (mapping: PasteColumnMapping): string =>
  mapping.mode === 'new' ? NEW : (mapping.columnKey ?? IGNORE);

function MappingRow({
  mapping,
  columns,
  onChange,
  labels,
}: {
  mapping: PasteColumnMapping;
  columns: CustomTableColumn[];
  onChange: (selection: PasteMappingSelection) => void;
  labels: ImportPreviewLabels;
}) {
  const sourceIndex = mapping.sourceIndex;
  if (sourceIndex === null) {
    return null;
  }
  const value = selectionValue(mapping);
  return (
    <li className="lumio-ct__map-row">
      <span className="lumio-ct__map-source" title={mapping.label}>
        {mapping.label}
      </span>
      <Select
        size="small"
        inputProps={{ 'aria-label': `${labels.target}: ${mapping.label}` }}
        value={value}
        onChange={next => {
          if (next === IGNORE) {
            onChange({ mode: 'ignore' });
          } else if (next === NEW) {
            onChange({ mode: 'new', newTitle: mapping.newTitle ?? mapping.label });
          } else {
            onChange({ mode: 'existing', columnKey: next });
          }
        }}
        options={[
          { value: IGNORE, label: labels.ignore },
          { value: NEW, label: labels.newColumn },
          ...columns.map(column => ({ value: column.key, label: column.title })),
        ]}
      />
      {mapping.mode === 'new' ? (
        <input
          className="lumio-ct__input lumio-ct__input--compact"
          aria-label={labels.newColumnTitle}
          placeholder={labels.newColumnTitle}
          defaultValue={mapping.newTitle ?? ''}
          onBlur={event => onChange({ mode: 'new', newTitle: event.target.value })}
        />
      ) : null}
    </li>
  );
}

/** Maps the columns of a pasted/imported sheet onto the table before insert. */
export function ImportPreviewDialog({ paste, columns, labels }: ImportPreviewDialogProps) {
  const { pastePreview: preview, pasteParsing, pasteApplying } = paste;
  const errorCount = preview ? Object.values(preview.errors).reduce((a, b) => a + b, 0) : 0;
  const canAdd = Boolean(
    preview?.dataRows.length && !preview.hasErrors && !paste.hasMissingPasteColumnTitles,
  );
  const visibleColumns = preview?.columns.filter(c => c.sourceIndex !== null) ?? [];

  return (
    <ModalShell
      isOpen={paste.pastePreviewOpen}
      onClose={paste.resetPastePreview}
      size="lg"
      title={labels.title}
      footer={
        <ModalFooter
          onCancel={paste.resetPastePreview}
          onConfirm={() => void paste.handlePasteAdd()}
          cancelText={labels.cancel}
          confirmText={fill(labels.add, { count: preview?.dataRows.length ?? 0 })}
          isConfirmLoading={pasteApplying}
          isConfirmDisabled={!canAdd || pasteParsing}
        />
      }
    >
      {pasteParsing || !preview ? (
        <div className="lumio-ct__center">
          <Spinner size={24} />
        </div>
      ) : (
        <div className="lumio-ct__import">
          {preview.hasHeadersToggle ? (
            <Checkbox
              label={labels.useHeaders}
              checked={paste.pasteUseHeaders}
              onCheckedChange={paste.handlePasteHeadersToggle}
            />
          ) : null}
          <div className="lumio-ct__map-head">
            <span>{labels.source}</span>
            <span>{labels.target}</span>
          </div>
          <ul className="lumio-ct__map">
            {preview.columns.map(mapping => (
              <MappingRow
                key={mapping.sourceIndex ?? mapping.columnKey ?? mapping.label}
                mapping={mapping}
                columns={columns}
                onChange={selection => {
                  if (mapping.sourceIndex !== null) {
                    paste.handlePasteMappingChange(mapping.sourceIndex, selection);
                  }
                }}
                labels={labels}
              />
            ))}
          </ul>
          <p className="lumio-ct__hint">
            {fill(labels.rowsSummary, {
              shown: preview.previewRows.length,
              total: preview.totalRows,
            })}
            {preview.extraRowsCount
              ? ` ${fill(labels.extraRows, { count: preview.extraRowsCount })}`
              : ''}
          </p>
          {errorCount ? (
            <p className="lumio-ct__error">{fill(labels.errors, { count: errorCount })}</p>
          ) : null}
          <div className="lumio-ct__preview-scroll">
            <table className="lumio-ct__preview">
              <thead>
                <tr>
                  {visibleColumns.map(column => (
                    <th key={column.sourceIndex}>
                      {column.mode === 'new' ? column.newTitle || column.label : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map(row => (
                  <tr key={row.id}>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.id}:${cell.sourceIndex ?? index}`}
                        className={cell.error ? 'lumio-ct__preview-error' : undefined}
                      >
                        {cell.sourceIndex === null ? (
                          cell.value
                        ) : (
                          <input
                            className="lumio-ct__preview-input"
                            value={cell.value}
                            aria-label={`${row.rowIndex + 1}:${cell.sourceIndex}`}
                            onChange={event =>
                              paste.handlePasteCellChange(
                                row.rowIndex,
                                cell.sourceIndex as number,
                                event.target.value,
                              )
                            }
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
