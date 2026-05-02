'use client';

import type { OnboardingIntegration } from '@/app/(onboarding)/onboarding/hooks/useOnboardingActions';
import { ProtocolIntegrationPage } from '@/app/integrations/open-protocol-page';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { PROTOCOL_CONFIGS } from './integration-connect-config';

type IntegrationConnectDialogProps = {
  integration: OnboardingIntegration | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (connected: boolean) => void;
};

export function IntegrationConnectDialog(props: IntegrationConnectDialogProps): React.JSX.Element {
  const { integration, open, onClose, onStatusChange } = props;
  const router = useRouter();
  const openSettings = (): void => {
    if (!integration) {
      return;
    }
    onClose();
    router.push(integration.path);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={dialogPaperProps}>
      <IntegrationDialogTitle integration={integration} onClose={onClose} />
      <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
        <IntegrationDialogContent
          integration={integration}
          onStatusChange={onStatusChange}
          onOpenSettings={openSettings}
        />
      </DialogContent>
    </Dialog>
  );
}

function IntegrationDialogTitle({
  integration,
  onClose,
}: { integration: OnboardingIntegration | null; onClose: () => void }): React.JSX.Element {
  return (
    <DialogTitle
      sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}
    >
      <Box>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>
          {integration ? `Connect ${integration.titleFallback}` : 'Connect integration'}
        </Typography>
        {integration ? (
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 14 }}>
            {integration.descriptionFallback}
          </Typography>
        ) : null}
      </Box>
      <IconButton aria-label="Close connection window" onClick={onClose} size="small">
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  );
}

function IntegrationDialogContent({
  integration,
  onStatusChange,
  onOpenSettings,
}: {
  integration: OnboardingIntegration | null;
  onStatusChange: (connected: boolean) => void;
  onOpenSettings: () => void;
}): React.JSX.Element | null {
  if (!integration) {
    return null;
  }
  const config = PROTOCOL_CONFIGS[integration.key];
  if (config) {
    return <ProtocolIntegrationPage embedded onStatusChange={onStatusChange} {...config} />;
  }
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        This integration uses its dedicated settings screen.
      </Typography>
      <Button variant="contained" onClick={onOpenSettings}>
        Open connection settings
      </Button>
    </Stack>
  );
}

const dialogPaperProps = {
  sx: {
    height: { xs: 'calc(100dvh - 24px)', md: 'min(820px, calc(100dvh - 48px))' },
    border: '1px solid',
    borderColor: 'divider',
  },
};
