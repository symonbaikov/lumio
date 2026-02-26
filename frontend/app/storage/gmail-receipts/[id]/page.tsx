'use client';

import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import { Checkbox } from '@/app/components/ui/checkbox';
import { gmailReceiptsApi } from '@/app/lib/api';
import apiClient from '@/app/lib/api';
import {
  getFinancialDocumentStatusLabel,
  isLowConfidenceDocument,
  normalizeReceiptLineItems,
  toFinancialDocumentStatus,
} from '@/app/lib/financial-document';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import {
  ArrowBack,
  Cancel,
  Category,
  CheckCircle,
  Delete,
  Edit,
  ExpandMore,
  IosShare,
  Payment,
  Receipt,
  Send,
  Warning,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
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
import Alert from '@mui/material/Alert';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';

interface GmailReceipt {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  gmailMessageId: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    tax?: number;
    category?: string;
    categoryId?: string;
    confidence?: number;
    validationIssues?: string[];
    lineItems?: Array<{ description: string; amount: number }>;
    transactionType?: 'income' | 'expense' | 'transfer' | 'unknown';
  };
  metadata?: {
    snippet?: string;
    attachments?: Array<{ filename: string; size: number }>;
    potentialDuplicates?: string[];
  };
  isDuplicate: boolean;
  duplicateOfId?: string;
}

interface ReceiptCategoryOption {
  id: string;
  name: string;
  isEnabled?: boolean;
}

interface EditableLineItem {
  id: string;
  description: string;
  amount: number;
}

interface EditableReceiptData {
  amount?: number;
  currency?: string;
  vendor?: string;
  date?: string;
  tax?: number;
  category?: string;
  categoryId?: string;
  lineItems: EditableLineItem[];
}

const createLineItemId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `line-${Math.random().toString(36).slice(2, 10)}`;

const formatCurrencyAmount = (amount: number, currency: string) => {
  if (!Number.isFinite(amount)) return `0 ${currency}`;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

const parseAmountValue = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const isIdEmpty = (id?: string | null) =>
  !id || id === 'null' || id === 'undefined' || id === '0' || id === '';

export default function GmailReceiptDocumentPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params.id;
  const router = useRouter();

  const [receipt, setReceipt] = useState<GmailReceipt | null>(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState<GmailReceipt[]>([]);
  const [categories, setCategories] = useState<ReceiptCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editedData, setEditedData] = useState<EditableReceiptData>({ lineItems: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<AuditEvent | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<Record<string, Partial<EditableLineItem>>>({});
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  const categoryFieldRef = useRef<HTMLSelectElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [receiptResponse, categoriesResponse] = await Promise.all([
        gmailReceiptsApi.getReceipt(receiptId),
        apiClient.get('/categories'),
      ]);

      const nextReceipt = receiptResponse.data.receipt as GmailReceipt;
      const parsedAmount = parseAmountValue(nextReceipt.parsedData?.amount ?? null) ?? 0;
      const nextLineItems = normalizeReceiptLineItems(nextReceipt.parsedData);
      const editableLineItems =
        nextLineItems.length > 0
          ? nextLineItems.map(item => ({ id: createLineItemId(), ...item }))
          : [
              {
                id: createLineItemId(),
                description: nextReceipt.parsedData?.vendor || '',
                amount: parsedAmount,
              },
            ];

      setReceipt(nextReceipt);
      setPotentialDuplicates(receiptResponse.data.potentialDuplicates || []);
      setCategories(categoriesResponse.data || []);
      setEditedData({
        amount: parsedAmount || undefined,
        currency: nextReceipt.parsedData?.currency || 'KZT',
        vendor: nextReceipt.parsedData?.vendor || '',
        date: nextReceipt.parsedData?.date || '',
        tax: nextReceipt.parsedData?.tax,
        category: nextReceipt.parsedData?.category,
        categoryId: nextReceipt.parsedData?.categoryId,
        lineItems: editableLineItems,
      });
    } catch (error) {
      console.error('Failed to load receipt details', error);
      toast.error('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!receiptId) return;
    setHistoryLoading(true);
    fetchEntityHistory('receipt', receiptId)
      .then(events => setHistoryEvents(events || []))
      .catch(error => {
        console.error('Failed to load receipt history', error);
        setHistoryEvents([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [receiptId]);

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const normalizedLineItems = editedData.lineItems
        .filter(item => Number.isFinite(item.amount))
        .map(item => ({ description: item.description, amount: item.amount }));
      const lineItemsTotal = normalizedLineItems.reduce((sum, item) => sum + item.amount, 0);

      await gmailReceiptsApi.updateReceiptParsedData(receiptId, {
        ...editedData,
        amount: normalizedLineItems.length > 0 ? lineItemsTotal : editedData.amount,
        lineItems: normalizedLineItems,
      });
      toast.success('Receipt updated');
      const response = await gmailReceiptsApi.getReceipt(receiptId);
      setReceipt(response.data.receipt);
      setPotentialDuplicates(response.data.potentialDuplicates || []);
    } catch (error) {
      console.error('Failed to save receipt changes', error);
      toast.error('Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitDocument = async () => {
    if (!receipt) return;
    const amount = parseAmountValue(editedData.amount ?? receipt.parsedData?.amount ?? null);
    if (amount === null || amount <= 0) {
      toast.error('Amount is required before submit');
      return;
    }
    try {
      setSubmitting(true);
      await gmailReceiptsApi.approveReceipt(receipt.id, {
        description: editedData.vendor || receipt.parsedData?.vendor || receipt.subject,
        amount,
        currency: editedData.currency || receipt.parsedData?.currency || 'KZT',
        date: editedData.date || receipt.parsedData?.date || receipt.receivedAt,
      });
      toast.success('Receipt submitted');
      const response = await gmailReceiptsApi.getReceipt(receiptId);
      setReceipt(response.data.receipt);
      setPotentialDuplicates(response.data.potentialDuplicates || []);
    } catch (error) {
      console.error('Failed to submit receipt', error);
      toast.error('Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await gmailReceiptsApi.exportReceiptsToSheets([receiptId]);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
      toast.success('Receipt exported');
    } catch (error) {
      console.error('Failed to export receipt', error);
      toast.error('Failed to export receipt');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkDuplicate = async (originalId: string) => {
    try {
      await gmailReceiptsApi.markDuplicate(receiptId, originalId);
      toast.success('Marked as duplicate');
      const response = await gmailReceiptsApi.getReceipt(receiptId);
      setReceipt(response.data.receipt);
      setPotentialDuplicates(response.data.potentialDuplicates || []);
    } catch (error) {
      console.error('Failed to mark duplicate', error);
      toast.error('Failed to mark duplicate');
    }
  };

  const handleUnmarkDuplicate = async () => {
    try {
      await gmailReceiptsApi.unmarkDuplicate(receiptId);
      toast.success('Duplicate mark removed');
      const response = await gmailReceiptsApi.getReceipt(receiptId);
      setReceipt(response.data.receipt);
      setPotentialDuplicates(response.data.potentialDuplicates || []);
    } catch (error) {
      console.error('Failed to unmark duplicate', error);
      toast.error('Failed to unmark duplicate');
    }
  };

  // Line item handlers
  const addLineItem = () => {
    setEditedData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: createLineItemId(), description: '', amount: 0 }],
    }));
  };

  const handleRowSelect = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === editedData.lineItems.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(editedData.lineItems.map(item => item.id)));
    }
  };

  const handleEditRow = (item: EditableLineItem) => {
    setEditingRow(item.id);
    setEditedRowData({ [item.id]: { ...item } });
  };

  const handleRowFieldChange = (
    itemId: string,
    field: keyof EditableLineItem,
    value: string | number,
  ) => {
    setEditedRowData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSaveRow = (itemId: string) => {
    const updates = editedRowData[itemId];
    if (!updates) return;
    setEditedData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => (item.id === itemId ? { ...item, ...updates } : item)),
    }));
    setEditingRow(null);
    setEditedRowData({});
  };

  const handleCancelRow = () => {
    setEditingRow(null);
    setEditedRowData({});
  };

  const handleDeleteRow = (itemId: string) => {
    if (editedData.lineItems.length <= 1) return;
    if (!window.confirm('Delete this line item?')) return;
    setEditedData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== itemId),
    }));
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} line item(s)?`)) return;
    setEditedData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => !selectedRows.has(item.id)),
    }));
    setSelectedRows(new Set());
  };

  const handleApplyBulkCategory = () => {
    if (!bulkCategoryId) return;
    const selected = categories.find(c => c.id === bulkCategoryId);
    setEditedData(prev => ({
      ...prev,
      categoryId: bulkCategoryId,
      category: selected?.name,
    }));
    setBulkCategoryDialogOpen(false);
    setBulkCategoryId('');
    toast.success('Category applied');
  };

  // Derived values
  const selectedCategoryId = editedData.categoryId || receipt?.parsedData?.categoryId || '';
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const hasCategory = !isIdEmpty(selectedCategoryId);
  const hasDisabledCategory = selectedCategory?.isEnabled === false;

  const workflowStatus = toFinancialDocumentStatus(receipt?.status);
  const statusLabel = getFinancialDocumentStatusLabel(workflowStatus);
  const currency = editedData.currency || receipt?.parsedData?.currency || 'KZT';
  const lineItemsTotal = editedData.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const amount =
    editedData.lineItems.length > 0
      ? lineItemsTotal
      : (parseAmountValue(editedData.amount ?? receipt?.parsedData?.amount ?? null) ?? 0);
  const confidence = receipt?.parsedData?.confidence;
  const confidencePercent =
    typeof confidence === 'number' ? Math.round(Math.min(1, Math.max(0, confidence)) * 100) : null;
  const warningCount = (receipt?.parsedData?.validationIssues || []).length;
  const isLowConfidence = isLowConfidenceDocument(confidence ?? null);
  const transactionType = receipt?.parsedData?.transactionType || 'expense';
  const income = transactionType === 'income' ? amount : 0;
  const expense = transactionType === 'income' ? 0 : amount;
  const lineItems = editedData.lineItems;
  const canSubmit = amount > 0;

  // Readiness banner
  const hasCategoryIssues = !hasCategory || hasDisabledCategory;
  const readinessSeverity: 'success' | 'warning' | 'error' = hasCategoryIssues
    ? 'error'
    : isLowConfidence || warningCount > 0
      ? 'warning'
      : 'success';

  const readinessDetails = useMemo(() => {
    const segments: string[] = [];
    if (!hasCategory) segments.push('No category selected.');
    if (hasDisabledCategory) segments.push('Selected category is disabled. Choose an active one.');
    if (isLowConfidence) segments.push(`Confidence is ${confidencePercent}%, review required.`);
    if (warningCount > 0) segments.push(`${warningCount} parsing warning(s) detected.`);
    if (lineItems.length === 0) segments.push('No line items. Add at least one line item.');
    return segments;
  }, [
    hasCategory,
    hasDisabledCategory,
    isLowConfidence,
    confidencePercent,
    warningCount,
    lineItems.length,
  ]);

  const readinessTitle =
    readinessSeverity === 'error'
      ? 'Needs attention before submit'
      : readinessSeverity === 'warning'
        ? 'Review before submitting'
        : 'Receipt is ready to submit';

  const readinessMessage =
    readinessDetails.length > 0
      ? readinessDetails.join(' · ')
      : 'All categories assigned. Data looks correct, ready to submit.';

  const readinessInlineText = `${readinessTitle}: ${readinessMessage}`;

  const enabledCategories = categories.filter(c => c.isEnabled !== false);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!receipt) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper
          elevation={0}
          sx={{ p: 6, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}
        >
          <Typography variant="body1" fontWeight={600}>
            Receipt not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/storage/gmail-receipts')}
            sx={{ mt: 2, textTransform: 'none' }}
          >
            Back to receipts
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container
      maxWidth={false}
      sx={{ py: 5, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
    >
      {/* Back + Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/storage/gmail-receipts')}
          sx={{
            mb: 3,
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Back
        </Button>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Title + chips */}
          <Box sx={{ minWidth: 240 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: 'text.primary',
                letterSpacing: '-0.02em',
              }}
            >
              {receipt.subject}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                icon={<Receipt />}
                label={`${Math.max(1, lineItems.length)} line items`}
                size="small"
                sx={{
                  bgcolor: 'grey.50',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  fontWeight: 500,
                  borderRadius: 1.5,
                  '& .MuiChip-icon': { color: 'text.secondary' },
                }}
              />
              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  bgcolor: 'primary.50',
                  color: 'primary.700',
                  border: '1px solid',
                  borderColor: 'primary.200',
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              />
              {hasCategoryIssues && (
                <Chip
                  icon={<Warning />}
                  label="Category required"
                  size="small"
                  sx={{
                    bgcolor: 'error.50',
                    color: 'error.800',
                    border: '1px solid',
                    borderColor: 'error.200',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'error.700' },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Category button */}
            <Button
              variant="outlined"
              startIcon={<Category />}
              onClick={() => categoryFieldRef.current?.focus()}
              title={selectedCategory?.name || 'Select category'}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                minWidth: 0,
                maxWidth: { xs: '100%', md: 280 },
                overflow: 'hidden',
                ...(hasCategoryIssues
                  ? {
                      borderColor: '#ef4444 !important',
                      color: '#b91c1c !important',
                      bgcolor: '#fef2f2 !important',
                      borderWidth: '2px !important',
                      '& .MuiButton-startIcon': { color: '#dc2626 !important' },
                      '&:hover': {
                        bgcolor: '#fee2e2 !important',
                        borderColor: '#dc2626 !important',
                      },
                    }
                  : {
                      borderColor: '#e5e7eb',
                      color: '#4b5563',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(25, 118, 210, 0.04)',
                      },
                    }),
              }}
            >
              <Box
                component="span"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {hasDisabledCategory
                  ? `${selectedCategory?.name} — disabled`
                  : hasCategory
                    ? selectedCategory?.name
                    : 'Category'}
              </Box>
            </Button>

            {/* Submit */}
            <Tooltip title={!canSubmit ? 'Add amount before submitting' : ''} placement="top">
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="outlined"
                  startIcon={submitting ? <CircularProgress size={18} /> : <Send />}
                  onClick={handleSubmitDocument}
                  disabled={!canSubmit || submitting}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    borderColor: 'grey.300',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'primary.300',
                      color: 'primary.700',
                      bgcolor: 'primary.50',
                    },
                  }}
                >
                  Submit
                </Button>
              </span>
            </Tooltip>

            {/* Pay — disabled, payable pipeline not yet integrated */}
            <Tooltip
              title="Pay workflow will be enabled after payable pipeline integration"
              placement="top"
            >
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="outlined"
                  startIcon={<Payment />}
                  disabled
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    borderColor: 'grey.200',
                    color: 'text.disabled',
                  }}
                >
                  Pay
                </Button>
              </span>
            </Tooltip>

            {/* Export */}
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={18} /> : <IosShare />}
              onClick={handleExport}
              disabled={exporting}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                borderColor: 'grey.300',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.300',
                  color: 'primary.700',
                  bgcolor: 'primary.50',
                },
              }}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Readiness Alert Banner — full-width bleed */}
      <Box
        sx={{
          mb: 3,
          width: { xs: 'calc(100% + 32px)', sm: 'calc(100% + 48px)' },
          ml: { xs: -2, sm: -3 },
        }}
      >
        <Alert
          variant="filled"
          severity={readinessSeverity}
          sx={{
            borderRadius: 0,
            px: { xs: 2.5, sm: 4 },
            py: 0.75,
            minHeight: 42,
            alignItems: 'center',
            '& .MuiAlert-message': { width: '100%', py: 0, overflow: 'hidden' },
            '& .MuiAlert-icon': { py: 0, mr: 1.25, alignItems: 'center' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: '100%',
              fontWeight: 600,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={readinessInlineText}
          >
            {readinessInlineText}
          </Typography>
        </Alert>
      </Box>

      {/* Summary Metrics — 4 cards */}
      <Box
        sx={{
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            Date
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {editedData.date
              ? new Date(editedData.date).toLocaleDateString()
              : new Date(receipt.receivedAt).toLocaleDateString()}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            Income
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'success.main' }}>
            {formatCurrencyAmount(income, currency)}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            Expense
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'error.main' }}>
            {formatCurrencyAmount(expense, currency)}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            Confidence
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mt: 0.5,
              color: isLowConfidence ? 'warning.main' : 'success.main',
            }}
          >
            {confidencePercent === null ? 'N/A' : `${confidencePercent}%`}
          </Typography>
        </Paper>
      </Box>

      {/* Parsing / Receipt Details Accordion */}
      <Accordion
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Receipt details &amp; parsing info
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3 }}>
          {/* Editable fields */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 3,
              mb: 3,
            }}
          >
            <TextField
              label="Vendor / Merchant"
              size="small"
              fullWidth
              value={editedData.vendor || ''}
              onChange={e => setEditedData(prev => ({ ...prev, vendor: e.target.value }))}
              sx={{
                '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } },
              }}
            />
            <TextField
              label="Date"
              size="small"
              fullWidth
              type="date"
              value={editedData.date ? editedData.date.split('T')[0] : ''}
              onChange={e => setEditedData(prev => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } },
              }}
            />
            <TextField
              label="Currency"
              size="small"
              fullWidth
              value={editedData.currency || ''}
              onChange={e => setEditedData(prev => ({ ...prev, currency: e.target.value }))}
              sx={{
                '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } },
              }}
            />
            <TextField
              label="Category"
              size="small"
              fullWidth
              select
              inputRef={categoryFieldRef}
              value={selectedCategoryId}
              onChange={e => {
                const selected = categories.find(c => c.id === e.target.value);
                setEditedData(prev => ({
                  ...prev,
                  categoryId: e.target.value,
                  category: selected?.name,
                }));
              }}
              sx={{
                '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } },
              }}
            >
              <MenuItem value="">Select category</MenuItem>
              {enabledCategories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Parsed metadata */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                From
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {receipt.sender || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Transaction type
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {receipt.parsedData?.transactionType || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tax
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {editedData.tax !== undefined && editedData.tax !== null
                  ? `${editedData.tax} ${currency}`
                  : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Confidence
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: isLowConfidence ? 'warning.main' : 'text.primary' }}
              >
                {confidencePercent === null ? '—' : `${confidencePercent}%`}
              </Typography>
            </Box>
            {warningCount > 0 && (
              <Box>
                <Typography variant="caption" color="warning.main">
                  Parsing warnings
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                  {warningCount}
                </Typography>
              </Box>
            )}
            {receipt.isDuplicate && (
              <Box>
                <Typography variant="caption" color="error">
                  Duplicate
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                  Yes
                </Typography>
              </Box>
            )}
          </Box>

          {/* Validation issues list */}
          {(receipt.parsedData?.validationIssues || []).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase' }}
              >
                Validation issues
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {receipt.parsedData?.validationIssues?.map(issue => (
                  <Typography
                    key={issue}
                    variant="body2"
                    sx={{ color: 'warning.dark', fontSize: '0.8125rem' }}
                  >
                    · {issue}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {/* Attachments & potential duplicates */}
          {(receipt.metadata?.attachments || []).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase' }}
              >
                Attachments
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {receipt.metadata?.attachments?.map(attachment => (
                  <Box
                    key={`${attachment.filename}-${attachment.size}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {attachment.filename}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setShowPreview(true)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: 'primary.main' }}
                    >
                      Preview
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {potentialDuplicates.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase' }}
              >
                Potential duplicates ({potentialDuplicates.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {potentialDuplicates.map(dup => (
                  <Paper
                    key={dup.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'warning.200',
                      borderRadius: 1,
                      bgcolor: 'warning.50',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.900' }}>
                      {dup.parsedData?.vendor || dup.sender}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'warning.800' }}>
                      {new Date(dup.parsedData?.date || dup.receivedAt).toLocaleDateString()} ·{' '}
                      {(dup.parsedData?.amount || 0).toLocaleString()}{' '}
                      {dup.parsedData?.currency || 'KZT'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleMarkDuplicate(dup.id)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'warning.400',
                          color: 'warning.800',
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: 'warning.100' },
                        }}
                      >
                        Mark as duplicate
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {receipt.isDuplicate && receipt.duplicateOfId && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleUnmarkDuplicate}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Unmark as duplicate
              </Button>
            </Box>
          )}

          {/* History timeline */}
          <Box sx={{ mt: 3 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase' }}
            >
              History
            </Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading history...</Typography>
              </Box>
            ) : (
              <EntityHistoryTimeline
                events={historyEvents}
                onSelect={event => {
                  setSelectedHistoryEvent(event);
                  setHistoryDrawerOpen(true);
                }}
              />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 3,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, color: 'primary.700', fontSize: '0.9375rem' }}
            >
              Selected: {selectedRows.size} item(s)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<Category />}
                onClick={() => setBulkCategoryDialogOpen(true)}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'primary.300',
                  color: 'primary.700',
                  borderRadius: 2,
                  '&:hover': { borderColor: 'primary.400', bgcolor: 'primary.100' },
                }}
              >
                Assign category
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
                size="small"
                sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2 }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Line Items Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Document lines
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={addLineItem}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'grey.300',
                color: 'text.secondary',
                borderRadius: 1.5,
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              + Add line
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSaveChanges}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              }}
            >
              Save changes
            </Button>
          </Box>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedRows.size === lineItems.length && lineItems.length > 0}
                  indeterminate={selectedRows.size > 0 && selectedRows.size < lineItems.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableCell>
              {['Date', 'Merchant', 'Description', 'Amount', 'Category', 'Flags', ''].map(label => (
                <TableCell
                  key={label}
                  align={label === 'Amount' ? 'right' : 'left'}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item, index) => {
              const isEditing = editingRow === item.id;
              const edited = editedRowData[item.id] || item;
              const missingCategory = !hasCategory && !editedData.categoryId;

              return (
                <TableRow
                  key={item.id}
                  hover
                  sx={{
                    bgcolor: missingCategory ? 'error.50' : undefined,
                    borderLeft: missingCategory ? '3px solid' : undefined,
                    borderLeftColor: missingCategory ? 'error.400' : undefined,
                    transition: 'all 0.15s',
                    '&:hover': {
                      bgcolor: missingCategory ? 'error.100' : 'grey.50',
                    },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.has(item.id)}
                      onCheckedChange={() => handleRowSelect(item.id)}
                    />
                  </TableCell>

                  {/* Date */}
                  <TableCell sx={{ minWidth: 100 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="date"
                        value={
                          (edited.description
                            ? editedData.date?.split('T')[0]
                            : editedData.date?.split('T')[0]) || ''
                        }
                        onChange={e => setEditedData(prev => ({ ...prev, date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    ) : editedData.date ? (
                      new Date(editedData.date).toLocaleDateString()
                    ) : (
                      new Date(receipt.receivedAt).toLocaleDateString()
                    )}
                  </TableCell>

                  {/* Merchant */}
                  <TableCell sx={{ minWidth: 140 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editedData.vendor || ''}
                        onChange={e => setEditedData(prev => ({ ...prev, vendor: e.target.value }))}
                        placeholder="Merchant"
                      />
                    ) : (
                      editedData.vendor || '—'
                    )}
                  </TableCell>

                  {/* Description */}
                  <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={edited.description ?? item.description}
                        onChange={e => handleRowFieldChange(item.id, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    ) : (
                      <Tooltip title={item.description}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.description || '—'}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Amount */}
                  <TableCell
                    align="right"
                    sx={{
                      color: transactionType === 'income' ? 'success.600' : 'error.600',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                    }}
                  >
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={edited.amount !== undefined ? edited.amount : item.amount}
                        onChange={e =>
                          handleRowFieldChange(
                            item.id,
                            'amount',
                            Number.parseFloat(e.target.value || '0'),
                          )
                        }
                        inputProps={{ style: { textAlign: 'right' } }}
                      />
                    ) : (
                      formatCurrencyAmount(item.amount, currency)
                    )}
                  </TableCell>

                  {/* Category */}
                  <TableCell sx={{ minWidth: 150 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        select
                        value={selectedCategoryId}
                        onChange={e => {
                          const sel = categories.find(c => c.id === e.target.value);
                          setEditedData(prev => ({
                            ...prev,
                            categoryId: e.target.value,
                            category: sel?.name,
                          }));
                        }}
                      >
                        <MenuItem value="">Select</MenuItem>
                        {enabledCategories.map(cat => (
                          <MenuItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Box>
                        {hasCategory && selectedCategory ? (
                          <Chip
                            label={
                              hasDisabledCategory
                                ? `${selectedCategory.name} — choose category`
                                : selectedCategory.name
                            }
                            size="small"
                            sx={{
                              bgcolor: hasDisabledCategory ? 'error.50' : 'primary.50',
                              color: hasDisabledCategory ? 'error.700' : 'primary.700',
                              border: hasDisabledCategory ? '1px solid' : 'none',
                              borderColor: hasDisabledCategory ? 'error.200' : 'transparent',
                              fontWeight: 500,
                              fontSize: '0.8125rem',
                            }}
                          />
                        ) : (
                          <Chip
                            label="No category"
                            size="small"
                            icon={<Warning sx={{ fontSize: 16 }} />}
                            sx={{
                              bgcolor: 'error.50',
                              color: 'error.700',
                              border: '1px solid',
                              borderColor: 'error.100',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              '& .MuiChip-icon': { color: 'error.600' },
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </TableCell>

                  {/* Flags */}
                  <TableCell>
                    {index === 0 &&
                      (isLowConfidence ? (
                        <Chip
                          label="Low confidence"
                          size="small"
                          sx={{
                            bgcolor: 'warning.50',
                            color: 'warning.800',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ) : (
                        <Chip
                          label="Parsed"
                          size="small"
                          sx={{
                            bgcolor: 'success.50',
                            color: 'success.800',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {isEditing ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveRow(item.id)}
                          sx={{
                            color: 'success.600',
                            '&:hover': { bgcolor: 'success.50' },
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancelRow}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { bgcolor: 'grey.100' },
                          }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditRow(item)}
                          sx={{
                            color: 'primary.600',
                            '&:hover': { bgcolor: 'primary.50' },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRow(item.id)}
                          disabled={lineItems.length <= 1}
                          sx={{
                            color: 'error.600',
                            '&:hover': { bgcolor: 'error.50' },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Category Dialog */}
      <Dialog
        open={bulkCategoryDialogOpen}
        onClose={() => setBulkCategoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'grey.200',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'text.primary',
            letterSpacing: '-0.01em',
            pb: 1,
          }}
        >
          Assign category to {selectedRows.size} item(s)
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            select
            label="Category"
            fullWidth
            value={bulkCategoryId}
            onChange={e => setBulkCategoryId(e.target.value)}
            helperText="Choose a category to assign to all selected line items"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: 'primary.main' },
              },
            }}
          >
            <MenuItem value="">Not selected</MenuItem>
            {enabledCategories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setBulkCategoryDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 500, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleApplyBulkCategory}
            disabled={!bulkCategoryId}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit event drawer */}
      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />

      {/* Receipt preview modal */}
      {showPreview ? (
        <ReceiptPreviewModal receiptId={receiptId} onClose={() => setShowPreview(false)} />
      ) : null}
    </Container>
  );
}
