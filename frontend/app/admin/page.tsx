'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import type { AuditEvent, AuditEventFilter } from '@/lib/api/audit';
import { fetchAuditEvents } from '@/lib/api/audit';
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
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuditEventDrawer } from '../audit/components/AuditEventDrawer';
import { AuditEventTable } from '../audit/components/AuditEventTable';
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

const ENTITY_TYPES = [
  'transaction',
  'statement',
  'receipt',
  'category',
  'rule',
  'workspace',
  'integration',
  'table_row',
  'table_cell',
  'branch',
  'wallet',
  'custom_table',
  'custom_table_column',
] as const;

const ACTIONS = [
  'create',
  'update',
  'delete',
  'import',
  'link',
  'unlink',
  'match',
  'unmatch',
  'apply_rule',
  'rollback',
  'export',
] as const;

const SEVERITIES = ['info', 'warn', 'critical'] as const;

export default function AdminPage() {
  const t = useIntlayer('adminPage') as any;
  const { locale } = useLocale();
  const [tab, setTab] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(50);
  const [auditFilters, setAuditFilters] = useState<AuditEventFilter>({});
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(null);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [statementsError, setStatementsError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const auditParams = useMemo(
    () => ({
      ...auditFilters,
      page: auditPage,
      limit: auditLimit,
    }),
    [auditFilters, auditPage, auditLimit],
  );

  useEffect(() => {
    if (tab === 0) {
      loadStatements();
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 2) {
      loadAuditLogs();
    }
  }, [tab, auditParams]);

  const loadStatements = async () => {
    setStatementsLoading(true);
    setStatementsError(null);
    try {
      const response = await apiClient.get<{ data: Statement[] }>('/statements?limit=100');
      setStatements(response.data.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setStatementsError(error.response?.data?.message || t.errors.loadStatements.value);
    } finally {
      setStatementsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await fetchAuditEvents(auditParams);
      setAuditLogs(response.data || []);
      setAuditTotal(response.total || 0);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setAuditError(error.response?.data?.message || t.errors.loadAudit.value);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReprocess = async (statementId: string) => {
    try {
      await apiClient.post(`/statements/${statementId}/reprocess`);
      loadStatements();
    } catch {
      setStatementsError(t.errors.reprocess.value);
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
      setStatementsError(t.errors.delete.value);
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
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
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
          {statementsError && tab === 0 && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: 'error.light',
                color: 'error.contrastText',
                borderRadius: 1,
              }}
            >
              {statementsError}
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
            <div className="min-h-screen bg-gray-50 px-6 py-8">
              <div className="w-full space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t.auditTab.title}</h2>
                  <p className="text-sm text-gray-600">{t.auditTab.helper}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
                  <div className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {t.auditTab.filters.title}
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.entityType}</span>
                        <select
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.entityType || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              entityType: (event.target.value ||
                                undefined) as AuditEventFilter['entityType'],
                            }));
                            setAuditPage(1);
                          }}
                        >
                          <option value="">{t.auditTab.filters.all}</option>
                          {ENTITY_TYPES.map(type => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.user}</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.actorLabel || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              actorLabel: event.target.value || undefined,
                            }));
                            setAuditPage(1);
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.action}</span>
                        <select
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.action || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              action: (event.target.value ||
                                undefined) as AuditEventFilter['action'],
                            }));
                            setAuditPage(1);
                          }}
                        >
                          <option value="">{t.auditTab.filters.all}</option>
                          {ACTIONS.map(action => (
                            <option key={action} value={action}>
                              {action}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.entityId}</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.entityId || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              entityId: event.target.value || undefined,
                            }));
                            setAuditPage(1);
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.severity}</span>
                        <select
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.severity || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              severity: (event.target.value ||
                                undefined) as AuditEventFilter['severity'],
                            }));
                            setAuditPage(1);
                          }}
                        >
                          <option value="">{t.auditTab.filters.all}</option>
                          {SEVERITIES.map(severity => (
                            <option key={severity} value={severity}>
                              {severity}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.dateFrom}</span>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.dateFrom || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              dateFrom: event.target.value || undefined,
                            }));
                            setAuditPage(1);
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="text-gray-500">{t.auditTab.filters.dateTo}</span>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                          value={auditFilters.dateTo || ''}
                          onChange={event => {
                            setAuditFilters(prev => ({
                              ...prev,
                              dateTo: event.target.value || undefined,
                            }));
                            setAuditPage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {auditError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {auditError}
                      </div>
                    )}
                    {auditLoading ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
                        {t.auditTab.loading}
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
                        {t.auditTab.empty}
                      </div>
                    ) : (
                      <AuditEventTable
                        events={auditLogs}
                        onSelect={event => {
                          setSelectedAuditEvent(event);
                          setAuditDrawerOpen(true);
                        }}
                        page={auditPage}
                        limit={auditLimit}
                        total={auditTotal}
                        onPageChange={setAuditPage}
                      />
                    )}
                  </div>
                </div>
              </div>

              <AuditEventDrawer
                event={selectedAuditEvent}
                open={auditDrawerOpen}
                onClose={() => setAuditDrawerOpen(false)}
              />
            </div>
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
