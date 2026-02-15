'use client';

import {
  AccountBalance as BankIcon,
  CalendarToday as CalendarIcon,
  Receipt as ReceiptIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  GlobalStyles,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React from 'react';

export interface Transaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  debit?: number;
  credit?: number;
  paymentPurpose: string;
  currency?: string;
  exchangeRate?: number;
  amountForeign?: number;
  categoryId?: string;
  branchId?: string;
  walletId?: string;
  article?: string;
  comments?: string;
  transactionType: 'income' | 'expense';
  category?: { id: string; name: string; isEnabled?: boolean };
  branch?: { id: string; name: string };
  wallet?: { id: string; name: string };
}

export interface Statement {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  balanceStart?: number | string | null;
  balanceEnd?: number | string | null;
  parsingDetails?: {
    detectedBank?: string;
    detectedFormat?: string;
    metadataExtracted?: {
      accountNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      balanceStart?: number;
      balanceEnd?: number;
      headerDisplay?: {
        title?: string;
        subtitle?: string;
        periodDisplay?: string;
        accountDisplay?: string;
        institutionDisplay?: string;
        currencyDisplay?: string;
      };
    };
  } | null;
}

interface TransactionDocumentViewerProps {
  statement: Statement;
  transactions: Transaction[];
  locale?: string;
}

export default function TransactionDocumentViewer({
  statement,
  transactions,
  locale = 'ru',
}: TransactionDocumentViewerProps) {
  const formatNumber = (value: number | undefined | null, currency = 'KZT') => {
    if (value === undefined || value === null) return '—';
    return `${new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} ${currency}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const totalIncome = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalExpense = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const netChange = totalIncome - totalExpense;

  const headerDisplay = statement.parsingDetails?.metadataExtracted?.headerDisplay;
  const detectedBank = statement.parsingDetails?.detectedBank || 'Банк не определен';
  const accountNumber = statement.parsingDetails?.metadataExtracted?.accountNumber || '—';

  return (
    <>
      <GlobalStyles
        styles={{
          '@media print': {
            body: {
              margin: 0,
              padding: 0,
              backgroundColor: '#ffffff',
            },
            '@page': {
              size: 'A4',
              margin: '15mm',
            },
            '.no-print': {
              display: 'none !important',
            },
            '.MuiPaper-root': {
              boxShadow: 'none !important',
              border: 'none !important',
            },
            '.page-break': {
              pageBreakBefore: 'always',
            },
            '.avoid-break': {
              pageBreakInside: 'avoid',
            },
          },
        }}
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          bgcolor: '#ffffff',
          minHeight: '100vh',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 4,
          '@media print': {
            p: 0,
            maxWidth: '100%',
          },
        }}
      >
        {/* Document Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            },
            '@media print': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BankIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
              <Box>
                <Typography variant="h4" fontWeight="700" letterSpacing="0.5px">
                  {headerDisplay?.title || 'Банковская выписка'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {detectedBank}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', my: 3 }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  md: '1fr 1fr 1fr',
                },
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                  Номер счета
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {accountNumber}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                  Период выписки
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {formatDate(statement.statementDateFrom)} —{' '}
                  {formatDate(statement.statementDateTo)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
                  Файл выписки
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="600"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statement.fileName}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Balance Summary Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: '1fr 1fr 1fr 1fr',
            },
            gap: 2,
            mb: 4,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
              '@media print': {
                border: '1px solid #e0e0e0 !important',
                pageBreakInside: 'avoid',
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Начальный баланс
            </Typography>
            <Typography variant="h5" fontWeight="700" color="text.primary">
              {formatNumber(
                typeof statement.balanceStart === 'string'
                  ? Number.parseFloat(statement.balanceStart)
                  : statement.balanceStart,
              )}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'success.light',
              borderRadius: 2,
              bgcolor: 'success.50',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)',
                transform: 'translateY(-2px)',
              },
              '@media print': {
                backgroundColor: '#e8f5e9 !important',
                border: '1px solid #81c784 !important',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                pageBreakInside: 'avoid',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
              <Typography variant="caption" color="success.dark">
                Поступления
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="700" color="success.main">
              {formatNumber(totalIncome)}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'error.light',
              borderRadius: 2,
              bgcolor: 'error.50',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
                transform: 'translateY(-2px)',
              },
              '@media print': {
                backgroundColor: '#ffebee !important',
                border: '1px solid #e57373 !important',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                pageBreakInside: 'avoid',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingDownIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
              <Typography variant="caption" color="error.dark">
                Списания
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="700" color="error.main">
              {formatNumber(totalExpense)}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
              '@media print': {
                border: '1px solid #e0e0e0 !important',
                pageBreakInside: 'avoid',
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Конечный баланс
            </Typography>
            <Typography variant="h5" fontWeight="700" color="text.primary">
              {formatNumber(
                typeof statement.balanceEnd === 'string'
                  ? Number.parseFloat(statement.balanceEnd)
                  : statement.balanceEnd,
              )}
            </Typography>
          </Paper>
        </Box>

        {/* Summary Info */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            bgcolor: netChange >= 0 ? 'success.50' : 'error.50',
            '@media print': {
              backgroundColor: netChange >= 0 ? '#e8f5e9 !important' : '#ffebee !important',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              pageBreakInside: 'avoid',
              mb: 2,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Изменение баланса за период
              </Typography>
              <Typography
                variant="h4"
                fontWeight="700"
                color={netChange >= 0 ? 'success.main' : 'error.main'}
              >
                {netChange >= 0 ? '+' : ''}
                {formatNumber(netChange)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Всего транзакций
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h4" fontWeight="700" color="primary.main">
                  {transactions.length}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Transactions Table */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            overflow: 'hidden',
            '@media print': {
              pageBreakInside: 'auto',
            },
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: 'grey.50',
              borderBottom: '1px solid',
              borderBottomColor: 'grey.200',
              '@media print': {
                backgroundColor: '#f5f5f5 !important',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              },
            }}
          >
            <Typography variant="h6" fontWeight="700" color="text.primary">
              Список транзакций
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Детальная информация по всем операциям
            </Typography>
          </Box>

          <TableContainer
            sx={{
              '@media print': {
                overflow: 'visible',
              },
            }}
          >
            <Table
              sx={{
                minWidth: 650,
                '@media print': {
                  fontSize: '0.85rem',
                },
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: 'grey.100',
                    '@media print': {
                      backgroundColor: '#f5f5f5 !important',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Дата
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Номер документа
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Контрагент
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    БИН
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Назначение платежа
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Дебет
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Кредит
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Валюта
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow
                    key={transaction.id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                      '&:last-child td': {
                        borderBottom: 0,
                      },
                      borderLeft: transaction.debit ? '3px solid' : '3px solid',
                      borderLeftColor: transaction.debit ? 'error.main' : 'success.main',
                      '@media print': {
                        pageBreakInside: 'avoid',
                        borderLeftColor: transaction.debit
                          ? '#f44336 !important'
                          : '#4caf50 !important',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      },
                    }}
                  >
                    <TableCell sx={{ minWidth: 100 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" fontWeight="500">
                          {formatDate(transaction.transactionDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.documentNumber || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="body2" fontWeight="600" color="text.primary">
                        {transaction.counterpartyName}
                      </Typography>
                      {transaction.counterpartyBank && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {transaction.counterpartyBank}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                        {transaction.counterpartyBin || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {transaction.paymentPurpose}
                      </Typography>
                      {transaction.category && (
                        <Chip
                          label={
                            transaction.category.isEnabled === false
                              ? `${transaction.category.name} - disabled`
                              : transaction.category.name
                          }
                          size="small"
                          sx={{
                            mt: 1,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor:
                              transaction.category.isEnabled === false ? 'error.50' : 'primary.50',
                            color:
                              transaction.category.isEnabled === false
                                ? 'error.main'
                                : 'primary.main',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {transaction.debit ? (
                        <Typography variant="body2" fontWeight="700" color="error.main">
                          {formatNumber(transaction.debit, transaction.currency)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {transaction.credit ? (
                        <Typography variant="body2" fontWeight="700" color="success.main">
                          {formatNumber(transaction.credit, transaction.currency)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                        {transaction.currency || 'KZT'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Footer with Totals */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'grey.50',
              borderTop: '2px solid',
              borderTopColor: 'grey.300',
              '@media print': {
                backgroundColor: '#f5f5f5 !important',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                pageBreakInside: 'avoid',
              },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 4,
                alignItems: 'center',
              }}
            >
              <Typography variant="body1" fontWeight="700" color="text.primary">
                ИТОГО:
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Всего списаний
                </Typography>
                <Typography variant="h6" fontWeight="700" color="error.main">
                  {formatNumber(totalExpense)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Всего поступлений
                </Typography>
                <Typography variant="h6" fontWeight="700" color="success.main">
                  {formatNumber(totalIncome)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Document Footer */}
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: '1px solid',
            borderTopColor: 'grey.200',
          }}
        >
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            Документ сформирован автоматически • Lumio Parse Ledger
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
            display="block"
            sx={{ mt: 0.5 }}
          >
            {new Date().toLocaleString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
