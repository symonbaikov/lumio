'use client';

import { MessageCircle } from '@/app/components/icons';
import { Alert } from '@/app/components/ui/alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

type Props = {
  tx: (path: string[], fallback: string) => string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
};

export function ExperimentalSection({ tx, enabled, setEnabled }: Props) {
  return (
    <Stack spacing={2.5}>
      <Alert variant="default">
        {tx(
          ['experimentalCard', 'warning'],
          'Experimental features are unfinished and may change or break. Turn this off to hide them.',
        )}
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(_event, value) => setEnabled(value)} />}
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2" fontWeight={500}>
                  {tx(['experimentalCard', 'toggleLabel'], 'Experimental mode')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tx(
                    ['experimentalCard', 'toggleHelp'],
                    'Unlocks features that are still in development on this device.',
                  )}
                </Typography>
              </Stack>
            }
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {tx(['experimentalCard', 'featuresTitle'], 'Experimental features')}
          </Typography>
        </Box>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ color: 'text.secondary', display: 'flex', pt: 0.25 }}>
              <MessageCircle size={18} />
            </Box>
            <Stack spacing={0.25}>
              <Typography variant="body2" fontWeight={500}>
                {tx(['experimentalCard', 'chatModeLabel'], 'Chat mode')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tx(
                  ['experimentalCard', 'chatModeHelp'],
                  'A chat-first shell for the app. Still unfinished, so it stays hidden unless experimental mode is on.',
                )}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
