'use client';

import { ContentCopy as CopyIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useIntlayer, useLocale } from "@/app/i18n";
import React, { useState } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import api from '../lib/api';

interface SharedLink {
  id: string;
  token: string;
  permission: string;
  expiresAt: string | null;
  allowAnonymous: boolean;
  description: string | null;
  status: string;
  accessCount: number;
  createdAt: string;
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  sharedLinks: SharedLink[];
  onLinksUpdate: () => void;
}

const resolveDateLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

/**
 * Dialog for creating and managing shared links
 */
export default function ShareDialog({
  open,
  onClose,
  fileId,
  sharedLinks,
  onLinksUpdate,
}: ShareDialogProps) {
  // useLockBodyScroll(open);
  const t = useIntlayer('shareDialog');
  const { locale } = useLocale();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.delete(`/storage/shares/${linkId}`);
      onLinksUpdate();
    } catch (error) {
      console.error('Failed to delete shared link:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(resolveDateLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPermissionLabel = (permissionValue: string) => {
    switch (permissionValue) {
      case 'view':
        return t.permissionLabel.view;
      case 'download':
        return t.permissionLabel.download;
      case 'edit':
        return t.permissionLabel.edit;
      default:
        return permissionValue;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t.statusLabel.active;
      case 'expired':
        return t.statusLabel.expired;
      default:
        return status;
    }
  };

  return (
    <Box>
      {/* Existing links */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t.activeLinks.value} ({sharedLinks.length})
        </Typography>

        {sharedLinks.length === 0 ? (
          <Typography color="text.secondary">{t.noLinks}</Typography>
        ) : (
          <List>
            {sharedLinks.map(link => (
              <ListItem
                key={link.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={getPermissionLabel(link.permission)}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={getStatusLabel(link.status)}
                        size="small"
                        color={link.status === 'active' ? 'success' : 'error'}
                      />
                      {link.expiresAt && (
                        <Chip
                          label={`${t.untilPrefix.value} ${formatDate(link.expiresAt)}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {link.description && (
                        <Typography variant="body2" color="text.secondary">
                          {link.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {t.createdPrefix.value}: {formatDate(link.createdAt)} •{' '}
                        {t.visitsPrefix.value}: {link.accessCount}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title={t.tooltips.copy.value}>
                    <IconButton
                      edge="end"
                      onClick={() => handleCopyLink(link.token)}
                      color={copiedToken === link.token ? 'success' : 'default'}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.tooltips.delete.value}>
                    <IconButton edge="end" onClick={() => handleDeleteLink(link.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
