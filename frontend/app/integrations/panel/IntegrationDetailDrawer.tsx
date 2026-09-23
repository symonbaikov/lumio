'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { ExternalLink } from '@/app/components/icons';
import { PanelBackTitle } from '@/app/components/panels/panel-ui';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { LocalCategorizationPanel } from '../local-categorization/LocalCategorizationPanel';
import { ProtocolIntegrationPage } from '../open-protocol-page';
import type { IntegrationEntry } from './integration-catalog';
import { WorkbookImportPanel } from './WorkbookImportPanel';

interface IntegrationDetailDrawerProps {
  entry: IntegrationEntry | undefined;
  onBack: () => void;
  onClose: () => void;
  /** Lets the list refresh its dots once a connection is saved or dropped. */
  onConnectionChange: () => void;
}

function DetailBody({
  entry,
  onConnectionChange,
  onClose,
}: {
  entry: IntegrationEntry;
  onConnectionChange: () => void;
  onClose: () => void;
}): React.JSX.Element {
  if (entry.detail.kind === 'local-categorization') {
    return <LocalCategorizationPanel />;
  }

  if (entry.detail.kind === 'workbook-import') {
    return <WorkbookImportPanel onNavigate={onClose} />;
  }

  const { config, secondary } = entry.detail;

  return (
    <>
      <ProtocolIntegrationPage
        {...config}
        embedded
        hideHeading
        onConnectionStatusChange={onConnectionChange}
      />
      {secondary ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
              {secondary.title}
            </Typography>
            <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: 'text.secondary' }}>
              {secondary.description}
            </Typography>
          </Box>
          <ProtocolIntegrationPage {...secondary} embedded hideHeading />
        </>
      ) : null}
    </>
  );
}

export function IntegrationDetailDrawer({
  entry,
  onBack,
  onClose,
  onConnectionChange,
}: IntegrationDetailDrawerProps): React.JSX.Element {
  return (
    <DrawerShell
      isOpen={Boolean(entry)}
      onClose={onClose}
      position="right"
      width="xl"
      zIndex={1400}
      title={entry ? <PanelBackTitle title={entry.name} onBack={onBack} /> : null}
    >
      {entry ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: 'text.secondary' }}>
            {entry.description}
          </Typography>

          <DetailBody entry={entry} onConnectionChange={onConnectionChange} onClose={onClose} />

          {entry.docsUrl ? (
            <Box
              component="a"
              href={entry.docsUrl}
              target="_blank"
              rel="noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                alignSelf: 'flex-start',
                fontSize: 13,
                fontWeight: 600,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'text.primary' },
              }}
            >
              Docs
              <ExternalLink size={14} />
            </Box>
          ) : null}
        </Box>
      ) : null}
    </DrawerShell>
  );
}
