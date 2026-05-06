'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { WorksheetOption } from '@/app/lib/googleSheetsSelection';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { GoogleSheetConnection, LayoutType } from './types';

const inputStyle: CSSProperties = {
  marginTop: 4,
  width: '100%',
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  padding: '8px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
};

export type SourceCardProps = {
  connections: GoogleSheetConnection[];
  loadingConnections: boolean;
  googleSheetId: string;
  onConnectionChange: (id: string) => void;
  worksheetName: string;
  setWorksheetName: (v: string) => void;
  worksheetOptions: WorksheetOption[];
  loadingWorksheets: boolean;
  selectedConnection: GoogleSheetConnection | null;
  range: string;
  setRange: (v: string) => void;
  headerRowIndex: number;
  setHeaderRowIndex: (v: number) => void;
  layoutType: LayoutType;
  setLayoutType: (v: LayoutType) => void;
  canPreview: boolean;
  loadingPreview: boolean;
  onPreview: () => void;
  t: Record<string, unknown>;
};

type T = {
  source: {
    title: string;
    connectionLabel: string;
    selectPlaceholder: string;
    oauthNeededSuffix: { value: string };
    emptyHint: string;
    emptyAction: string;
    worksheetLabel: string;
    worksheetLoading: string;
    worksheetPlaceholder: string;
    worksheetHelp: string;
    rangeLabel: string;
    rangePlaceholder: { value: string };
    headerOffsetLabel: string;
    headerOffsetHelp: string;
    layoutLabel: string;
    layoutAuto: string;
    layoutFlat: string;
    layoutMatrix: string;
    previewButtonLoading: string;
    previewButton: string;
    loadingConnections: string;
  };
};

export const SourceCard = ({
  connections, loadingConnections, googleSheetId, onConnectionChange,
  worksheetName, setWorksheetName, worksheetOptions, loadingWorksheets, selectedConnection,
  range, setRange, headerRowIndex, setHeaderRowIndex, layoutType, setLayoutType,
  canPreview, loadingPreview, onPreview, t: tRaw,
}: SourceCardProps): React.JSX.Element => {
  const t = tRaw as unknown as T;
  return (
    <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }} data-tour-id="gs-import-source-card">
      <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>{t.source.title}</Typography>
      <ConnectionSelect connections={connections} googleSheetId={googleSheetId} onConnectionChange={onConnectionChange} loadingConnections={loadingConnections} t={t} />
      <WorksheetSelect worksheetName={worksheetName} setWorksheetName={setWorksheetName} worksheetOptions={worksheetOptions} loadingWorksheets={loadingWorksheets} selectedConnection={selectedConnection} t={t} />
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.source.rangeLabel}</span>
        <input value={range} onChange={e => setRange(e.target.value)} data-tour-id="gs-import-range" style={inputStyle} placeholder={t.source.rangePlaceholder.value} />
      </label>
      <LayoutOptions headerRowIndex={headerRowIndex} setHeaderRowIndex={setHeaderRowIndex} layoutType={layoutType} setLayoutType={setLayoutType} t={t} />
      <PreviewButton canPreview={canPreview} loadingPreview={loadingPreview} loadingConnections={loadingConnections} onPreview={onPreview} t={t} />
    </Box>
  );
};

type PreviewButtonProps = {
  canPreview: boolean;
  loadingPreview: boolean;
  loadingConnections: boolean;
  onPreview: () => void;
  t: T;
};

const isPreviewDisabled = ({
  canPreview, loadingPreview, loadingConnections,
}: { canPreview: boolean; loadingPreview: boolean; loadingConnections: boolean }): boolean =>
  !canPreview || loadingPreview || loadingConnections;

const PreviewButton = ({ canPreview, loadingPreview, loadingConnections, onPreview, t }: PreviewButtonProps): React.JSX.Element => {
  const disabled = isPreviewDisabled({ canPreview, loadingPreview, loadingConnections });
  const showSpinner = loadingPreview || loadingConnections;
  const label = loadingConnections ? t.source.previewButtonLoading : t.source.previewButton;
  return (
    <>
      <Box component="button" onClick={onPreview} disabled={disabled} data-tour-id="gs-import-preview-button"
        sx={{ display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: 'primary.main', color: '#fff', px: 2, py: 1, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { opacity: 0.7, cursor: 'not-allowed' } }}
      >
        {showSpinner && <Spinner className="h-4 w-4" />}
        {label}
      </Box>
      {loadingConnections && <Typography style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>{t.source.loadingConnections}</Typography>}
    </>
  );
};

const ConnectionSelect = ({
  connections, googleSheetId, onConnectionChange, loadingConnections, t,
}: { connections: GoogleSheetConnection[]; googleSheetId: string; onConnectionChange: (id: string) => void; loadingConnections: boolean; t: T }): React.JSX.Element => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.source.connectionLabel}</span>
    <select value={googleSheetId} onChange={e => onConnectionChange(e.target.value)} data-tour-id="gs-import-connection" style={inputStyle}>
      <option value="">{t.source.selectPlaceholder}</option>
      {connections.map(c => (
        <option key={c.id} value={c.id} disabled={c.oauthConnected === false}>
          {c.sheetName}{c.oauthConnected === false ? t.source.oauthNeededSuffix.value : ''}
        </option>
      ))}
    </select>
    {!connections.length && !loadingConnections ? (
      <Box sx={{ mt: 1, border: '1px dashed var(--border-color)', bgcolor: 'var(--muted)', p: 1.5, fontSize: 12, color: 'var(--text-secondary)' }}>
        {t.source.emptyHint}{' '}
        <Link href="/integrations/google-sheets" style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}>{t.source.emptyAction}</Link>
      </Box>
    ) : null}
  </label>
);

const WorksheetSelect = ({
  worksheetName, setWorksheetName, worksheetOptions, loadingWorksheets, selectedConnection, t,
}: { worksheetName: string; setWorksheetName: (v: string) => void; worksheetOptions: WorksheetOption[]; loadingWorksheets: boolean; selectedConnection: GoogleSheetConnection | null; t: T }): React.JSX.Element => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.source.worksheetLabel}</span>
    <select value={worksheetName} onChange={e => setWorksheetName(e.target.value)} data-tour-id="gs-import-worksheet"
      style={{ ...inputStyle, opacity: (!selectedConnection || loadingWorksheets) ? 0.6 : 1 }}
      disabled={!selectedConnection || loadingWorksheets}
    >
      <option value="">{loadingWorksheets ? t.source.worksheetLoading : t.source.worksheetPlaceholder}</option>
      {worksheetOptions.map(item => <option key={item.title} value={item.title}>{item.title}</option>)}
    </select>
    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>{t.source.worksheetHelp}</span>
  </label>
);

const LayoutOptions = ({
  headerRowIndex, setHeaderRowIndex, layoutType, setLayoutType, t,
}: { headerRowIndex: number; setHeaderRowIndex: (v: number) => void; layoutType: LayoutType; setLayoutType: (v: LayoutType) => void; t: T }): React.JSX.Element => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.source.headerOffsetLabel}</span>
      <input type="number" min={0} value={headerRowIndex} onChange={e => setHeaderRowIndex(Number(e.target.value))} data-tour-id="gs-import-header-offset" style={inputStyle} />
      <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>{t.source.headerOffsetHelp}</span>
    </label>
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{t.source.layoutLabel}</span>
      <select value={layoutType} onChange={e => setLayoutType(e.target.value as LayoutType)} data-tour-id="gs-import-layout" style={inputStyle}>
        <option value="auto">{t.source.layoutAuto}</option>
        <option value="flat">{t.source.layoutFlat}</option>
        <option value="matrix">{t.source.layoutMatrix}</option>
      </select>
    </label>
  </Box>
);
