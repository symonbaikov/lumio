'use client';

import { Download, File as FileIcon, Trash2 } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import {
  type TransactionAttachment,
  type TransactionTag,
  transactionFilesApi,
} from '@/app/lib/transaction-files-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface TransactionFilesTabProps {
  transactionId: string;
  labels: {
    tabTitle: string;
    tagsTitle: string;
    tagsEmpty: string;
    attachmentsTitle: string;
    attachmentsEmpty: string;
    upload: string;
    loadFailed: string;
    saveFailed: string;
    uploadFailed: string;
    deleteFailed: string;
  };
}

const formatSize = (bytes: number | string): string => {
  const value = typeof bytes === 'string' ? Number.parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(value)) {
    return '';
  }
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export function TransactionFilesTab({ transactionId, labels }: TransactionFilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workspaceTags, setWorkspaceTags] = useState<TransactionTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [allTags, ownTags, files] = await Promise.all([
        transactionFilesApi.listWorkspaceTags(),
        transactionFilesApi.getTags(transactionId),
        transactionFilesApi.listAttachments(transactionId),
      ]);
      setWorkspaceTags(allTags);
      setSelectedTagIds(ownTags.map(tag => tag.id));
      setAttachments(files);
    } catch {
      toast.error(labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [transactionId, labels.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleTag = async (tagId: string): Promise<void> => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];

    // Optimistic: the chip reacts immediately and rolls back if the save fails.
    const previous = selectedTagIds;
    setSelectedTagIds(next);
    setBusy(true);
    try {
      await transactionFilesApi.setTags(transactionId, next);
    } catch {
      setSelectedTagIds(previous);
      toast.error(labels.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const created = await transactionFilesApi.uploadAttachment(transactionId, file);
      setAttachments(prev => [created, ...prev]);
    } catch {
      toast.error(labels.uploadFailed);
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (attachment: TransactionAttachment): Promise<void> => {
    try {
      const blob = await transactionFilesApi.downloadAttachment(attachment.id);
      triggerDownload(blob, attachment.fileName);
    } catch {
      toast.error(labels.loadFailed);
    }
  };

  const handleDelete = async (attachmentId: string): Promise<void> => {
    setBusy(true);
    try {
      await transactionFilesApi.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(item => item.id !== attachmentId));
    } catch {
      toast.error(labels.deleteFailed);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {labels.tagsTitle}
        </Typography>
        {workspaceTags.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {labels.tagsEmpty}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {workspaceTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  disabled={busy}
                  onClick={() => void toggleTag(tag.id)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={
                    isSelected && tag.color
                      ? { bgcolor: tag.color, color: '#fff', borderColor: tag.color }
                      : undefined
                  }
                />
              );
            })}
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FileIcon size={16} />
          <Typography variant="subtitle2" fontWeight={600}>
            {labels.attachmentsTitle}
          </Typography>
        </Box>

        {attachments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {labels.attachmentsEmpty}
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {attachments.map(attachment => (
              <Box
                key={attachment.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {attachment.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatSize(attachment.fileSize)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    onClick={() => void handleDownload(attachment)}
                    aria-label={`Download ${attachment.fileName}`}
                  >
                    <Download size={16} />
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() => void handleDelete(attachment.id)}
                    aria-label={`Delete ${attachment.fileName}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </Box>
              </Box>
            ))}
          </Stack>
        )}

        <Button
          variant="outlined"
          size="small"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {labels.upload}
        </Button>
        <Box
          component="input"
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv,.xlsx,.xls,.docx"
          capture="environment"
          sx={{ display: 'none' }}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            void handleUpload(event.target.files?.[0])
          }
        />
      </Box>
    </Stack>
  );
}
