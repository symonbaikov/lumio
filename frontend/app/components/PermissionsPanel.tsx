'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import {
  PersonAdd as AddPersonIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import api from '../lib/api';

interface Permission {
  id: string;
  user: {
    id: string;
    email: string;
  };
  grantedBy: {
    id: string;
    email: string;
  };
  permissionType: string;
  canReshare: boolean;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PermissionsPanelProps {
  fileId: string;
  permissions: Permission[];
  onPermissionsUpdate: () => void;
}

/**
 * Panel for managing file permissions and access control
 */
export default function PermissionsPanel({
  fileId,
  permissions,
  onPermissionsUpdate,
}: PermissionsPanelProps) {
  const t = useIntlayer('permissionsPanel');
  const { locale } = useLocale();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // useLockBodyScroll(grantDialogOpen || editDialogOpen);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // Grant form state
  const [userEmail, setUserEmail] = useState('');
  const [permissionType, setPermissionType] = useState('viewer');
  const [canReshare, setCanReshare] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGrantPermission = async () => {
    try {
      setGranting(true);
      setError(null);

      // First, find user by email (you may need to add an endpoint for this)
      // For now, we'll assume you have the userId
      // In production, you'd want to add a user search endpoint

      await api.post(`/storage/files/${fileId}/permissions`, {
        userId: userEmail, // This should be userId, not email
        permissionType,
        canReshare,
        expiresAt: expiresAt || undefined,
      });

      // Reset form
      setUserEmail('');
      setPermissionType('viewer');
      setCanReshare(false);
      setExpiresAt('');
      setGrantDialogOpen(false);

      // Reload permissions
      onPermissionsUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.errors.grantFailed.value);
    } finally {
      setGranting(false);
    }
  };

  const handleUpdatePermission = async () => {
    if (!selectedPermission) return;

    try {
      setGranting(true);
      setError(null);

      await api.put(`/storage/permissions/${selectedPermission.id}`, {
        permissionType,
        canReshare,
        expiresAt: expiresAt || null,
      });

      setEditDialogOpen(false);
      setSelectedPermission(null);
      onPermissionsUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.errors.updateFailed.value);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!confirm(t.confirmRevoke.value)) {
      return;
    }

    try {
      await api.delete(`/storage/permissions/${permissionId}`);
      onPermissionsUpdate();
    } catch (error) {
      console.error('Failed to revoke permission:', error);
    }
  };

  const handleEditClick = (permission: Permission) => {
    setSelectedPermission(permission);
    setPermissionType(permission.permissionType);
    setCanReshare(permission.canReshare);
    setExpiresAt(permission.expiresAt || '');
    setEditDialogOpen(true);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  };

  const getPermissionLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      owner: t.permission.owner.value,
      editor: t.permission.editor.value,
      viewer: t.permission.viewer.value,
      downloader: t.permission.downloader.value,
    };
    return labelMap[type] || type;
  };

  const getPermissionColor = (type: string) => {
    const colors: Record<string, 'success' | 'primary' | 'default' | 'info'> = {
      owner: 'success',
      editor: 'primary',
      viewer: 'default',
      downloader: 'info',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h6">
            {t.title.value} ({permissions.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddPersonIcon />}
            onClick={() => setGrantDialogOpen(true)}
          >
            {t.grantAccess}
          </Button>
        </Box>

        {permissions.length === 0 ? (
          <Alert severity="info">{t.empty}</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.table.user}</TableCell>
                  <TableCell>{t.table.rights}</TableCell>
                  <TableCell>{t.table.canReshare}</TableCell>
                  <TableCell>{t.table.expires}</TableCell>
                  <TableCell>{t.table.grantedBy}</TableCell>
                  <TableCell>{t.table.createdAt}</TableCell>
                  <TableCell align="center">{t.table.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map(permission => (
                  <TableRow key={permission.id}>
                    <TableCell>{permission.user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getPermissionLabel(permission.permissionType)}
                        size="small"
                        color={getPermissionColor(permission.permissionType)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={permission.canReshare ? t.values.yes : t.values.no}
                        size="small"
                        color={permission.canReshare ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {permission.expiresAt ? (
                        <Chip
                          label={formatDate(permission.expiresAt)}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        t.values.forever
                      )}
                    </TableCell>
                    <TableCell>{permission.grantedBy.email}</TableCell>
                    <TableCell>{formatDate(permission.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={t.tooltips.edit.value}>
                        <IconButton size="small" onClick={() => handleEditClick(permission)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t.tooltips.revoke.value}>
                        <IconButton
                          size="small"
                          onClick={() => handleRevokePermission(permission.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Grant Permission Dialog */}
      <Dialog
        open={grantDialogOpen}
        onClose={() => setGrantDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t.dialogs.grantTitle}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              fullWidth
              label={t.dialogs.userIdOrEmail.value}
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              helperText={t.dialogs.userIdOrEmailHelp.value}
            />

            <FormControl fullWidth>
              <InputLabel>{t.dialogs.accessLevel}</InputLabel>
              <Select
                value={permissionType}
                label={t.dialogs.accessLevel.value}
                onChange={e => setPermissionType(e.target.value)}
              >
                <MenuItem value="viewer">{t.permission.viewer}</MenuItem>
                <MenuItem value="downloader">{t.permission.viewDownloadLong}</MenuItem>
                <MenuItem value="editor">{t.permission.editorLong}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={t.dialogs.expiresAt.value}
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={t.dialogs.expiresAtHelp.value}
            />

            <FormControlLabel
              control={
                <Switch checked={canReshare} onChange={e => setCanReshare(e.target.checked)} />
              }
              label={t.dialogs.reshare.value}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialogOpen(false)}>{t.dialogs.cancel}</Button>
          <Button
            variant="contained"
            onClick={handleGrantPermission}
            disabled={!userEmail || granting}
          >
            {t.dialogs.grant}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permission Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t.dialogs.editTitle}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl fullWidth>
              <InputLabel>{t.dialogs.accessLevel}</InputLabel>
              <Select
                value={permissionType}
                label={t.dialogs.accessLevel.value}
                onChange={e => setPermissionType(e.target.value)}
              >
                <MenuItem value="viewer">{t.permission.viewer}</MenuItem>
                <MenuItem value="downloader">{t.permission.viewDownloadLong}</MenuItem>
                <MenuItem value="editor">{t.permission.editorLong}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={t.dialogs.expiresAt.value}
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch checked={canReshare} onChange={e => setCanReshare(e.target.checked)} />
              }
              label={t.dialogs.reshare.value}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t.dialogs.cancel}</Button>
          <Button variant="contained" onClick={handleUpdatePermission} disabled={granting}>
            {t.dialogs.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
