'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useRef, useState } from 'react';
import { BackgroundSelector } from '@/app/(main)/workspaces/components/BackgroundSelector';
import { AVAILABLE_BACKGROUNDS } from '@/app/(main)/workspaces/constants';
import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import { getApiErrorMessage } from '@/app/lib/api-error';
import {
  MAX_CONTENT_BACKGROUND_BYTES,
  MAX_CONTENT_BACKGROUND_DIM,
  presetFileName,
  resolveContentBackgroundSrc,
} from '@/app/lib/content-background';
import type { Tx } from '@/app/settings/profile/hooks/useSettingsText';

type Props = {
  tx: Tx;
  contentBackground: string | null;
  dim: number;
  onPreviewDim: (value: number) => void;
  onSaveDim: (value: number) => void;
  onSelectPreset: (fileName: string) => void;
  /** Rejects when the image could not be stored; the card shows why. */
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
};

export function ContentBackgroundCard({
  tx,
  contentBackground,
  dim,
  onPreviewDim,
  onSaveDim,
  onSelectPreset,
  onUpload,
  onRemove,
}: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedPreset = presetFileName(contentBackground);
  const uploadedSrc =
    contentBackground && !selectedPreset ? resolveContentBackgroundSrc(contentBackground) : null;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared up front so picking the same file again still fires a change.
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    if (file.size > MAX_CONTENT_BACKGROUND_BYTES) {
      setUploadError(tx(['contentBackground', 'sizeError'], 'The image must be 10 MB or smaller.'));
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      setUploadError(
        getApiErrorMessage(
          error,
          tx(['contentBackground', 'uploadError'], "Couldn't upload the image."),
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card variant="outlined">
      <Box sx={{ px: 2, pt: 2, pb: 0 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {tx(['contentBackground', 'title'], 'Background image')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tx(
            ['contentBackground', 'help'],
            'Put a photo behind lists and tables: pick one of ours or upload your own.',
          )}
        </Typography>
      </Box>
      <CardContent>
        <Stack spacing={2}>
          {uploadError ? <Alert variant="error">{uploadError}</Alert> : null}

          <BackgroundSelector
            compact
            backgrounds={AVAILABLE_BACKGROUNDS}
            selectedBackground={selectedPreset}
            onSelect={onSelectPreset}
          />

          {uploadedSrc ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src={uploadedSrc}
                alt=""
                sx={{
                  width: 120,
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '2px solid var(--primary)',
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {tx(['contentBackground', 'uploaded'], 'Your image')}
              </Typography>
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              startIcon={uploading ? <Spinner size={16} /> : undefined}
            >
              {tx(['contentBackground', 'upload'], 'Upload image')}
            </Button>
            {contentBackground ? (
              <Button color="error" onClick={onRemove}>
                {tx(['contentBackground', 'remove'], 'Remove')}
              </Button>
            ) : null}
          </Stack>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={event => void handleFile(event)}
          />

          {contentBackground ? (
            <Box sx={{ maxWidth: 320 }}>
              <Typography id="content-background-dim" variant="body2" fontWeight={500}>
                {tx(['contentBackground', 'dimLabel'], 'Fade the photo')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tx(['contentBackground', 'dimHelp'], 'Higher values keep text easier to read.')}
              </Typography>
              <Slider
                aria-labelledby="content-background-dim"
                value={dim}
                min={0}
                max={MAX_CONTENT_BACKGROUND_DIM}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${value}%`}
                onChange={(_event, value) => onPreviewDim(value as number)}
                onChangeCommitted={(_event, value) => onSaveDim(value as number)}
              />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
