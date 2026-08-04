'use client';

import { Calendar, DollarSign, User } from '@/app/components/icons';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

interface DuplicateTransaction {
  id: string;
  date: string;
  amount: number;
  counterparty: string;
  purpose: string;
  statementId: string;
  similarity?: number;
  matchType?: string;
  matchedFields?: string[];
}

interface DuplicateGroup {
  master: DuplicateTransaction;
  duplicates: DuplicateTransaction[];
  confidence: number;
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selected: boolean;
  onToggle: () => void;
  /** Currency the group's amounts are denominated in. */
  currency?: string;
}

export default function DuplicateGroupCard({
  group,
  selected,
  onToggle,
  currency = DEFAULT_CURRENCY,
}: DuplicateGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.95) {
      return 'success';
    }
    if (confidence >= 0.85) {
      return 'warning';
    }
    return 'error';
  };

  const getMatchTypeColor = (matchType?: string): 'success' | 'info' | 'warning' | 'default' => {
    switch (matchType) {
      case 'exact':
        return 'success';
      case 'hybrid':
        return 'info';
      case 'fuzzy':
        return 'warning';
      case 'semantic':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box
      sx={{
        border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        p: 3,
        transition: 'border-color 200ms',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Checkbox checked={selected} onChange={onToggle} sx={{ mt: 0.5, p: 0 }} />

        <Box sx={{ flex: 1 }}>
          {/* Header */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${Math.round(group.confidence * 100)}% Match`}
                size="small"
                color={getConfidenceColor(group.confidence)}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {group.duplicates.length} duplicate{group.duplicates.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Button variant="text" size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Hide' : 'Show'} Details
            </Button>
          </Box>

          {/* Master Transaction */}
          <Box
            sx={{
              bgcolor: 'var(--color-success-soft-bg)',
              p: 2,
              mb: 2,
              border: '1px solid var(--color-success-soft-border)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography
                sx={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  color: 'var(--color-success-soft-text)',
                  textTransform: 'uppercase',
                }}
              >
                MASTER
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={16} style={{ color: 'var(--muted-foreground)' }} />
                <Typography variant="body2">{formatDate(group.master.date)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DollarSign size={16} style={{ color: 'var(--muted-foreground)' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatAmount(group.master.amount)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <User size={16} style={{ color: 'var(--muted-foreground)' }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.master.counterparty}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.master.purpose}
              </Typography>
            </Box>
          </Box>

          {/* Duplicate Transactions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.duplicates.slice(0, expanded ? undefined : 2).map((duplicate, index) => (
              <Box
                key={duplicate.id}
                sx={{ bgcolor: 'var(--muted)', p: 2, border: '1px solid var(--border-color)' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'var(--destructive)',
                      textTransform: 'uppercase',
                    }}
                  >
                    DUPLICATE {index + 1}
                  </Typography>
                  {duplicate.matchType && (
                    <Chip
                      label={duplicate.matchType}
                      size="small"
                      color={getMatchTypeColor(duplicate.matchType)}
                      variant={
                        duplicate.matchType === 'semantic' ||
                        !['exact', 'hybrid', 'fuzzy', 'semantic'].includes(duplicate.matchType)
                          ? 'outlined'
                          : 'filled'
                      }
                    />
                  )}
                  {duplicate.similarity && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {Math.round(duplicate.similarity * 100)}% similar
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calendar size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <Typography variant="body2">{formatDate(duplicate.date)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DollarSign size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatAmount(duplicate.amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <User size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {duplicate.counterparty}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {duplicate.purpose}
                  </Typography>
                </Box>
                {expanded && duplicate.matchedFields && duplicate.matchedFields.length > 0 && (
                  <Box
                    sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Matched fields:
                    </Typography>
                    {duplicate.matchedFields.map(field => (
                      <Chip key={field} label={field} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            {!expanded && group.duplicates.length > 2 && (
              <Typography
                variant="body2"
                sx={{ textAlign: 'center', color: 'text.secondary', py: 1 }}
              >
                +{group.duplicates.length - 2} more duplicate
                {group.duplicates.length - 2 !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
