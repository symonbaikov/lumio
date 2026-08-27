'use client';
import { formatStoredDate } from '@/app/lib/user-format-store';

import StatementCategoryDrawer from '@/app/(main)/statements/[id]/edit/StatementCategoryDrawer';
import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { CheckCircle2, ChevronDown } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import type { AuditEvent } from '@/lib/api/audit';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import type {
  EditableLineItem,
  EditableReceiptData,
  GmailReceipt,
  ReceiptCategoryOption,
} from '../hooks/useGmailReceiptData';

interface ParsedMetadataFieldProps {
  label: string;
  value: React.ReactNode;
  color?: string;
}

function ParsedMetadataField({
  label,
  value,
  color,
}: ParsedMetadataFieldProps): React.ReactElement {
  return (
    <Box>
      <Typography variant="caption" color={color || 'text.secondary'}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: color ? `${color}.main` : undefined }}
      >
        {value}
      </Typography>
    </Box>
  );
}

interface GmailReceiptDetailsProps {
  receipt: GmailReceipt;
  potentialDuplicates: GmailReceipt[];
  editedData: EditableReceiptData;
  lineItems: EditableLineItem[];
  categories: ReceiptCategoryOption[];
  enabledCategories: ReceiptCategoryOption[];
  selectedCategoryId: string;
  isLowConfidence: boolean;
  confidencePercent: number | null;
  warningCount: number;
  currency: string;
  historyEvents: AuditEvent[];
  historyLoading: boolean;
  selectedHistoryEvent: AuditEvent | null;
  historyDrawerOpen: boolean;
  categoryDrawerOpen: boolean;
  categorySaving: boolean;
  bulkCategoryDialogOpen: boolean;
  bulkCategoryId: string;
  onMarkDuplicate: (id: string) => Promise<void>;
  onUnmarkDuplicate: () => Promise<void>;
  onHistorySelect: (event: AuditEvent) => void;
  onHistoryDrawerClose: () => void;
  onCategorySelect: (id: string) => Promise<void>;
  onCategoryDrawerClose: () => void;
  onBulkCategoryClose: () => void;
  onBulkCategoryIdChange: (id: string) => void;
  onApplyBulkCategory: () => void;
  setEditedData: React.Dispatch<React.SetStateAction<EditableReceiptData>>;
  setShowPreview: (show: boolean) => void;
}

export function GmailReceiptDetails({
  receipt,
  potentialDuplicates,
  editedData,
  enabledCategories,
  selectedCategoryId,
  isLowConfidence,
  confidencePercent,
  warningCount,
  currency,
  historyEvents,
  historyLoading,
  selectedHistoryEvent,
  historyDrawerOpen,
  categoryDrawerOpen,
  categorySaving,
  onMarkDuplicate,
  onUnmarkDuplicate,
  onHistorySelect,
  onHistoryDrawerClose,
  onCategorySelect,
  onCategoryDrawerClose,
  setEditedData,
  setShowPreview,
}: GmailReceiptDetailsProps): React.ReactElement {
  return (
    <>
      <Accordion
        elevation={0}
        sx={{
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Receipt details &amp; parsing info
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3 }}>
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
            <CustomDatePicker
              label="Date"
              value={editedData.date ? editedData.date.split('T')[0] : ''}
              onChange={value => setEditedData(prev => ({ ...prev, date: value }))}
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
              value={selectedCategoryId}
              onChange={e => {
                const selected = enabledCategories.find(c => c.id === e.target.value);
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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 2,
            }}
          >
            <ParsedMetadataField label="From" value={receipt.sender || '—'} />
            <ParsedMetadataField
              label="Transaction type"
              value={receipt.parsedData?.transactionType || '—'}
            />
            <ParsedMetadataField
              label="Tax"
              value={
                editedData.tax !== undefined && editedData.tax !== null
                  ? `${editedData.tax} ${currency}`
                  : '—'
              }
            />
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
              <ParsedMetadataField label="Parsing warnings" value={warningCount} color="warning" />
            )}
            {receipt.isDuplicate && (
              <ParsedMetadataField label="Duplicate" value="Yes" color="error" />
            )}
          </Box>

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
                      borderColor: 'divider',
                      bgcolor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
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
                      bgcolor: 'warning.50',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.900' }}>
                      {dup.parsedData?.vendor || dup.sender}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'warning.800' }}>
                      {formatStoredDate(dup.parsedData?.date || dup.receivedAt)} ·{' '}
                      {(dup.parsedData?.amount || 0).toLocaleString()}{' '}
                      {dup.parsedData?.currency || 'KZT'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onMarkDuplicate(dup.id)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'warning.400',
                          color: 'warning.800',
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
                onClick={onUnmarkDuplicate}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Unmark as duplicate
              </Button>
            </Box>
          )}

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
                <Spinner className="h-4 w-4 text-inherit" />
                <Typography variant="body2">Loading history...</Typography>
              </Box>
            ) : (
              <EntityHistoryTimeline
                events={historyEvents}
                onSelect={event => {
                  onHistorySelect(event);
                }}
              />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={onHistoryDrawerClose}
      />

      <StatementCategoryDrawer
        open={categoryDrawerOpen}
        onClose={onCategoryDrawerClose}
        categories={enabledCategories}
        selectedCategoryId={selectedCategoryId}
        selecting={categorySaving}
        onSelect={onCategorySelect}
        labels={{
          title: 'Category',
          searchPlaceholder: 'Search categories',
          allOption: 'Not selected',
          noResults: 'No categories found',
        }}
        width="sm"
        showAllOption
      />
    </>
  );
}

interface BulkCategoryDialogProps {
  open: boolean;
  selectedRowsSize: number;
  bulkCategoryId: string;
  enabledCategories: ReceiptCategoryOption[];
  onClose: () => void;
  onCategoryChange: (id: string) => void;
  onApply: () => void;
}

export function BulkCategoryDialog({
  open,
  selectedRowsSize,
  bulkCategoryId,
  enabledCategories,
  onClose,
  onCategoryChange,
  onApply,
}: BulkCategoryDialogProps): React.ReactElement {
  return (
    <Box
      component="dialog"
      open={open}
      sx={{
        display: open ? 'block' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: 'rgba(0,0,0,0.5)',
        border: 'none',
        p: 0,
        m: 0,
        width: '100%',
        height: '100%',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          bgcolor: 'background.paper',
          p: 3,
          minWidth: 360,
          maxWidth: 480,
          border: '1px solid',
          borderColor: 'grey.200',
        }}
        onClick={e => e.stopPropagation()}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'text.primary',
            letterSpacing: '-0.01em',
            pb: 1,
          }}
        >
          Assign category to {selectedRowsSize} item(s)
        </Typography>
        <Box sx={{ pt: 3 }}>
          <TextField
            select
            label="Category"
            fullWidth
            value={bulkCategoryId}
            onChange={e => onCategoryChange(e.target.value)}
            helperText="Choose a category to assign to all selected line items"
            sx={{
              '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } },
            }}
          >
            <MenuItem value="">Not selected</MenuItem>
            {enabledCategories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 3 }}>
          <Button
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 500, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle2 size={18} />}
            onClick={onApply}
            disabled={!bulkCategoryId}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
