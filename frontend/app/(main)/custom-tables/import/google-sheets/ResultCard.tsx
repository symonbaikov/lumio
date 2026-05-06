'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { Box, Typography } from '@mui/material';
import { Sparkles, Tag as CategoryIconFallback } from '@/app/components/icons';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Category, PreviewResponse } from './types';

const inputStyle: CSSProperties = {
  marginTop: 4, width: '100%', border: '1px solid var(--border-color)', background: 'var(--card-bg)',
  padding: '8px 12px', fontSize: 14, boxSizing: 'border-box',
};

type T = {
  result: {
    title: string;
    tableNameLabel: string;
    tableNamePlaceholder: { value: string };
    descriptionLabel: string;
    categoryLabel: string;
    noCategory: string;
    categoryHint: string;
    importDataCheckbox: React.ReactNode;
    importRunning: string;
    importButton: string;
    progressTitle: React.ReactNode;
    statusLabel: { value: string };
    dash: { value: string };
    needPreviewHint: React.ReactNode;
  };
};

type JobProgressProps = { jobStatus: string; jobProgress: number; jobStage: string; jobError: string; t: T };
const JobProgress = ({ jobStatus, jobProgress, jobStage, jobError, t }: JobProgressProps): React.JSX.Element => (
  <Box sx={{ mt: 1.5, border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{t.result.progressTitle}</Typography>
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{Math.round(jobProgress)}%</Typography>
    </Box>
    <Box sx={{ mt: 1, height: 8, width: '100%', bgcolor: 'action.hover', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', bgcolor: 'primary.main', width: `${Math.max(0, Math.min(100, jobProgress))}%` }} />
    </Box>
    <Typography style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
      {t.result.statusLabel.value}: <span style={{ fontWeight: 500 }}>{jobStatus || t.result.dash.value}</span>{' '}
      {jobStage ? <span style={{ color: 'var(--muted-foreground)' }}>({jobStage})</span> : null}
    </Typography>
    {jobError ? <Typography style={{ marginTop: 8, fontSize: 12, color: 'var(--destructive)', overflowWrap: 'break-word' }}>{jobError}</Typography> : null}
  </Box>
);

type CategoryBadgeProps = { categoryId: string; categories: Category[]; hint: React.ReactNode };
const CategoryBadge = ({ categoryId, categories, hint }: CategoryBadgeProps): React.JSX.Element | null => {
  if (!categoryId) return null;
  const selected = categories.find(c => c.id === categoryId);
  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
      <Box sx={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', bgcolor: selected?.color || 'var(--muted)' }}>
        {selected?.icon ? <CategoryIconFallback size={16} /> : <Image src="/icons/icons8-google-sheets-48.png" alt="Google Sheets" width={16} height={16} className="h-4 w-4" />}
      </Box>
      <span>{hint}</span>
    </Box>
  );
};

export type ResultCardProps = {
  tableName: string;
  setTableName: (v: string) => void;
  tableDescription: string;
  setTableDescription: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categories: Category[];
  importData: boolean;
  setImportData: (v: boolean) => void;
  canCommit: boolean;
  committing: boolean;
  jobId: string;
  jobStatus: string;
  jobProgress: number;
  jobStage: string;
  jobError: string;
  preview: PreviewResponse | null;
  onCommit: () => void;
  t: Record<string, unknown>;
};

type TableFormProps = { tableName: string; setTableName: (v: string) => void; tableDescription: string; setTableDescription: (v: string) => void; categoryId: string; setCategoryId: (v: string) => void; categories: Category[]; t: T };
const TableForm = ({ tableName, setTableName, tableDescription, setTableDescription, categoryId, setCategoryId, categories, t }: TableFormProps): React.JSX.Element => (
  <>
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.result.tableNameLabel}</span>
      <input value={tableName} onChange={e => setTableName(e.target.value)} data-tour-id="gs-import-table-name" style={inputStyle} placeholder={t.result.tableNamePlaceholder.value} />
    </label>
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.result.descriptionLabel}</span>
      <input value={tableDescription} onChange={e => setTableDescription(e.target.value)} style={inputStyle} />
    </label>
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.result.categoryLabel}</span>
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} data-tour-id="gs-import-category" style={inputStyle}>
        <option value="">{t.result.noCategory}</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <CategoryBadge categoryId={categoryId} categories={categories} hint={t.result.categoryHint} />
    </label>
  </>
);

type CommitButtonProps = { canCommit: boolean; committing: boolean; jobId: string; onCommit: () => void; t: T };
const CommitButton = ({ canCommit, committing, jobId, onCommit, t }: CommitButtonProps): React.JSX.Element => (
  <Box component="button" onClick={onCommit} disabled={!canCommit || committing || Boolean(jobId)}
    data-tour-id="gs-import-commit-button"
    sx={{ display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: '#059669', color: '#fff', px: 2, py: 1, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: '#047857' }, '&:disabled': { opacity: 0.7, cursor: 'not-allowed' } }}
  >
    {committing ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
    {jobId ? t.result.importRunning : t.result.importButton}
  </Box>
);

export const ResultCard = ({
  tableName, setTableName, tableDescription, setTableDescription,
  categoryId, setCategoryId, categories, importData, setImportData,
  canCommit, committing, jobId, jobStatus, jobProgress, jobStage, jobError, preview, onCommit, t: tRaw,
}: ResultCardProps): React.JSX.Element => {
  const t = tRaw as unknown as T;
  return (
    <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }} data-tour-id="gs-import-result-card">
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>{t.result.title}</Typography>
      <TableForm tableName={tableName} setTableName={setTableName} tableDescription={tableDescription} setTableDescription={setTableDescription} categoryId={categoryId} setCategoryId={setCategoryId} categories={categories} t={t} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, color: 'var(--foreground)', mb: 2 }} data-tour-id="gs-import-import-data">
        <Checkbox checked={importData} onCheckedChange={v => setImportData(v as boolean)} className="h-5 w-5" />
        {t.result.importDataCheckbox}
      </Box>
      <CommitButton canCommit={canCommit} committing={committing} jobId={jobId} onCommit={onCommit} t={t} />
      {jobId ? <JobProgress jobStatus={jobStatus} jobProgress={jobProgress} jobStage={jobStage} jobError={jobError} t={t} /> : null}
      {!preview && <Typography style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>{t.result.needPreviewHint}</Typography>}
    </Box>
  );
};
