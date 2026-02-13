'use client';

import { Delete, Error as ErrorIcon, Refresh } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useIntlayer, useLocale } from 'next-intlayer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import apiClient from '../lib/api';

interface Statement {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  bankName: string;
  totalTransactions: number;
  createdAt: string;
  processedAt: string | null;
  errorMessage: string | null;
}

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorLabel: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export default function AdminPage() {
  const t = useIntlayer('adminPage');
  const { locale } = useLocale();
  const [tab, setTab] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (tab === 0) {
      loadStatements();
    } else if (tab === 2) {
      loadAuditLogs();
    }
  }, [tab]);

  const loadStatements = async () => {
    setStatementsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: Statement[] }>('/statements?limit=100');
      setStatements(response.data.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.loadStatements.value);
    } finally {
      setStatementsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setStatementsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: AuditEvent[] }>('/audit-events');
      setAuditLogs((response.data as any).data || response.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.errors.loadAudit.value);
    } finally {
      setStatementsLoading(false);
    }
  };

  const handleReprocess = async (statementId: string) => {
    try {
      await apiClient.post(`/statements/${statementId}/reprocess`);
      loadStatements();
    } catch {
      setError(t.errors.reprocess.value);
    }
  };

  const handleDelete = async (statementId: string) => {
    if (!confirm(t.confirmDelete.value)) {
      return;
    }
    try {
      await apiClient.delete(`/statements/${statementId}`);
      loadStatements();
    } catch {
      setError(t.errors.delete.value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t.status.completed.value;
      case 'processing':
        return t.status.processing.value;
      case 'error':
        return t.status.error.value;
      default:
        return status;
    }
  };

  const filteredStatements = statements.filter(
    s =>
      s.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bankName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t.title}
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label={t.tabs.statementsLog.value} />
          <Tab label={t.tabs.users.value} />
          <Tab label={t.tabs.audit.value} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {error && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: 'error.light',
                color: 'error.contrastText',
                borderRadius: 1,
              }}
            >
              {error}
            </Box>
          )}

          {tab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField
                  label={t.search.value}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  sx={{ flexGrow: 1 }}
                />
                <Button variant="outlined" startIcon={<Refresh />} onClick={loadStatements}>
                  {t.refresh}
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t.table.file}</TableCell>
                      <TableCell>{t.table.type}</TableCell>
                      <TableCell>{t.table.bank}</TableCell>
                      <TableCell>{t.table.status}</TableCell>
                      <TableCell>{t.table.transactions}</TableCell>
                      <TableCell>{t.table.uploadedAt}</TableCell>
                      <TableCell>{t.table.processedAt}</TableCell>
                      <TableCell>{t.table.actions}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStatements.map(statement => (
                      <TableRow key={statement.id}>
                        <TableCell>{statement.fileName}</TableCell>
                        <TableCell>{statement.fileType.toUpperCase()}</TableCell>
                        <TableCell>{statement.bankName}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(statement.status)}
                            color={
                              getStatusColor(statement.status) as
                                | 'success'
                                | 'info'
                                | 'error'
                                | 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{statement.totalTransactions || 0}</TableCell>
                        <TableCell>
                          {new Date(statement.createdAt).toLocaleDateString(locale)}
                        </TableCell>
                        <TableCell>
                          {statement.processedAt
                            ? new Date(statement.processedAt).toLocaleDateString(locale)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedStatement(statement);
                              setDialogOpen(true);
                            }}
                            disabled={!statement.errorMessage}
                          >
                            <ErrorIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleReprocess(statement.id)}
                            disabled={statement.status === 'processing' || statementsLoading}
                          >
                            <Refresh />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(statement.id)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t.usersTab.hint}
              </Typography>
              <Button variant="contained" component={Link} href="/admin/users">
                {t.usersTab.button}
              </Button>
            </Box>
          )}

          {tab === 2 && (
            <Box>
              {auditLogs.length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                  {t.auditTab.empty}
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t.auditTab.action}</TableCell>
                        <TableCell>{t.auditTab.description}</TableCell>
                        <TableCell>{t.auditTab.user}</TableCell>
                        <TableCell>{t.auditTab.date}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            {log.entityType} • {log.entityId}
                          </TableCell>
                          <TableCell>{log.actorLabel || '—'}</TableCell>
                          <TableCell>{new Date(log.createdAt).toLocaleString(locale)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t.errorDialog.title}</DialogTitle>
        <DialogContent>
          {selectedStatement?.errorMessage && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedStatement.errorMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t.errorDialog.close}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
