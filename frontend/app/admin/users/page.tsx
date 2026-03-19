'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { useIntlayer, useLocale } from '@/app/i18n';
import { Cancel, Edit, Save } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  permissions: string[] | null;
  createdAt: string;
}

export default function UsersManagementPage() {
  const t = useIntlayer('adminUsersPage');
  const { locale } = useLocale();
  const ALL_PERMISSIONS = [
    { value: 'statement.view', label: t.permissions.statementView.value },
    { value: 'statement.upload', label: t.permissions.statementUpload.value },
    { value: 'statement.delete', label: t.permissions.statementDelete.value },
    { value: 'statement.edit', label: t.permissions.statementEdit.value },
    { value: 'transaction.view', label: t.permissions.transactionView.value },
    { value: 'transaction.edit', label: t.permissions.transactionEdit.value },
    {
      value: 'transaction.delete',
      label: t.permissions.transactionDelete.value,
    },
    {
      value: 'transaction.bulk_update',
      label: t.permissions.transactionBulkUpdate.value,
    },
    { value: 'category.view', label: t.permissions.categoryView.value },
    { value: 'category.create', label: t.permissions.categoryCreate.value },
    { value: 'category.edit', label: t.permissions.categoryEdit.value },
    { value: 'category.delete', label: t.permissions.categoryDelete.value },
    { value: 'branch.view', label: t.permissions.branchView.value },
    { value: 'branch.create', label: t.permissions.branchCreate.value },
    { value: 'branch.edit', label: t.permissions.branchEdit.value },
    { value: 'branch.delete', label: t.permissions.branchDelete.value },
    { value: 'wallet.view', label: t.permissions.walletView.value },
    { value: 'wallet.create', label: t.permissions.walletCreate.value },
    { value: 'wallet.edit', label: t.permissions.walletEdit.value },
    { value: 'wallet.delete', label: t.permissions.walletDelete.value },
    { value: 'report.view', label: t.permissions.reportView.value },
    { value: 'report.export', label: t.permissions.reportExport.value },
    { value: 'google_sheet.view', label: t.permissions.googleSheetView.value },
    {
      value: 'google_sheet.connect',
      label: t.permissions.googleSheetConnect.value,
    },
    { value: 'google_sheet.sync', label: t.permissions.googleSheetSync.value },
  ];

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // useLockBodyScroll(permissionsDialogOpen);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: User[] }>('/users');
      setUsers(response.data.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.loadUsers.value);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = async (user: User) => {
    try {
      const response = await apiClient.get(`/users/${user.id}/permissions`);
      setSelectedPermissions(response.data.customPermissions || []);
      setEditingUser(user);
      setPermissionsDialogOpen(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.loadPermissions.value);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      await apiClient.put(`/users/${editingUser.id}/permissions`, {
        permissions: selectedPermissions,
      });
      setPermissionsDialogOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.savePermissions.value);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      await apiClient.post(`/users/${editingUser.id}/permissions/reset`);
      setPermissionsDialogOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.resetPermissions.value);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission],
    );
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await apiClient.put(`/users/${userId}`, { role: newRole });
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.updateRole.value);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.updateStatus.value);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t.title}
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              label={t.search.value}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button variant="outlined" onClick={loadUsers} disabled={loading}>
              {t.refresh}
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t.table.email}</TableCell>
                    <TableCell>{t.table.name}</TableCell>
                    <TableCell>{t.table.role}</TableCell>
                    <TableCell>{t.table.status}</TableCell>
                    <TableCell>{t.table.permissions}</TableCell>
                    <TableCell>{t.table.createdAt}</TableCell>
                    <TableCell>{t.table.actions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={user.role}
                            onChange={e => handleUpdateRole(user.id, e.target.value)}
                          >
                            <MenuItem value="admin">{t.roles.admin}</MenuItem>
                            <MenuItem value="user">{t.roles.user}</MenuItem>
                            <MenuItem value="viewer">{t.roles.viewer}</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? t.status.active : t.status.inactive}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                          onClick={() => handleToggleActive(user)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.permissions?.length || t.permissionsChip.default.value}
                          color={user.permissions?.length ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString(
                          locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleEditPermissions(user)}
                          title={t.tooltips.managePermissions.value}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      <Dialog
        open={permissionsDialogOpen}
        onClose={() => {
          setPermissionsDialogOpen(false);
          setEditingUser(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t.dialog.titlePrefix.value}: {editingUser?.name} ({editingUser?.email})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t.dialog.rolePrefix.value}: <strong>{editingUser?.role}</strong>.{' '}
              {t.dialog.subtitleSuffix}
            </Typography>
            <FormGroup>
              {ALL_PERMISSIONS.map(perm => (
                <FormControlLabel
                  key={perm.value}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(perm.value)}
                      onChange={() => handleTogglePermission(perm.value)}
                    />
                  }
                  label={perm.label}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetPermissions} disabled={saving} color="warning">
            {t.dialog.resetDefaults}
          </Button>
          <Button
            onClick={() => {
              setPermissionsDialogOpen(false);
              setEditingUser(null);
            }}
            disabled={saving}
          >
            {t.dialog.cancel}
          </Button>
          <Button onClick={handleSavePermissions} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t.dialog.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
