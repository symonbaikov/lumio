'use client';

import { Box, Typography } from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Plug } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

interface Step2Texts {
  step2: {
    label: React.ReactNode;
    title: React.ReactNode;
    description: React.ReactNode;
    appsScriptDoc: React.ReactNode;
    openSheets: React.ReactNode;
    showTechnicalDetails: React.ReactNode;
    webhookEndpointLabel: { value: string };
    webhookHeaderLabel: { value: string };
    webhookTokenHint: { value: string };
  };
}

interface Step2AppScriptProps {
  t: Step2Texts;
}

function TechnicalDetails({ t }: { t: Step2Texts }): React.JSX.Element {
  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: tokens.radius.lg,
        bgcolor: 'var(--muted)',
        border: '1px dashed var(--border-color)',
        px: 1.5,
        py: 1,
      }}
    >
      <Typography style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {t.step2.webhookEndpointLabel.value}:{' '}
        <code style={{ fontFamily: 'monospace' }}>/api/v1/integrations/google-sheets/update</code>
        <br />
        {t.step2.webhookHeaderLabel.value}:{' '}
        <code style={{ fontFamily: 'monospace' }}>
          X-Webhook-Token: &lt;{t.step2.webhookTokenHint.value}&gt;
        </code>
      </Typography>
    </Box>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid var(--border-color)',
  borderRadius: tokens.radius.md,
  padding: '8px 12px',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--foreground)',
  textDecoration: 'none',
};

export function Step2AppScript({ t }: Step2AppScriptProps): React.JSX.Element {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Box
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        p: 2,
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      }}
      data-tour-id="gs-integration-step2"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: tokens.radius.sm,
            bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            display: 'flex',
          }}
        >
          <Plug style={{ height: 20, width: 20, color: 'var(--color-primary)' }} />
        </Box>
        <Box>
          <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            {t.step2.label}
          </Typography>
          <Typography style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
            {t.step2.title}
          </Typography>
        </Box>
      </Box>
      <Typography style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {t.step2.description}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <a
          href="https://github.com/symonbaikov/parse-ledger/blob/main/docs/google-sheets-apps-script.md"
          target="_blank"
          rel="noreferrer"
          data-tour-id="gs-integration-apps-script"
          style={linkStyle}
        >
          {t.step2.appsScriptDoc}
          <ExternalLink style={{ height: 16, width: 16 }} />
        </a>
        <a
          href="https://docs.google.com/spreadsheets/u/0/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          {t.step2.openSheets}
          <ExternalLink style={{ height: 16, width: 16 }} />
        </a>
      </Box>
      <Box sx={{ mt: 2 }}>
        <button
          type="button"
          onClick={(): void => setShowDetails(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t.step2.showTechnicalDetails}
          {showDetails ? (
            <ChevronUp style={{ height: 16, width: 16 }} />
          ) : (
            <ChevronDown style={{ height: 16, width: 16 }} />
          )}
        </button>
        {showDetails && <TechnicalDetails t={t} />}
      </Box>
    </Box>
  );
}
