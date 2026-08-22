'use client';

import { AlertTriangle, CalendarClock } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fillTemplate, text } from '../helpers/dashboard-helpers';

interface CommitmentItem {
  date: string;
  label: string;
  amount: number;
  source: 'payable' | 'subscription';
  sourceId: string;
  isOverdue: boolean;
}

interface Commitments {
  currency: string;
  horizonDays: number;
  openingBalance: number;
  totalCommitted: number;
  unscheduledCommitted: number;
  items: CommitmentItem[];
  lowestBalance: number;
  lowestBalanceDate: string;
  shortfallDate: string | null;
}

const HORIZON_DAYS = 60;
const VISIBLE_ITEMS = 5;

const CARD_SX = {
  p: 2.5,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

type CashRunwayWidgetProps = {
  formatAmount: (value: number) => string;
};

export function CashRunwayWidget({ formatAmount }: CashRunwayWidgetProps) {
  const t = useIntlayer('cashRunwayWidget');
  const [data, setData] = useState<Commitments | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .get('/dashboard/commitments', { params: { days: HORIZON_DAYS } })
      .then(res => setData(res.data?.data ?? res.data ?? null))
      .catch(() => {
        // A failed projection hides the card rather than breaking the dashboard.
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return null;
  }

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <CalendarClock size={18} />
      <Typography variant="subtitle2" fontWeight={600}>
        {t.title}
      </Typography>
    </Box>
  );

  if (!data || (data.items.length === 0 && data.unscheduledCommitted === 0)) {
    return (
      <Box sx={CARD_SX}>
        {header}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t.emptyDescription}
        </Typography>
        <Button component={Link} href="/statements/pay" size="small" variant="text">
          {t.openPayables}
        </Button>
      </Box>
    );
  }

  const hasShortfall = data.shortfallDate !== null;
  const summary = hasShortfall
    ? fillTemplate(text(t.shortfallSummary), {
        date: data.shortfallDate ?? '',
        days: String(data.horizonDays),
      })
    : fillTemplate(text(t.safeSummary), {
        amount: formatAmount(data.lowestBalance),
        days: String(data.horizonDays),
      });

  return (
    <Box sx={CARD_SX}>
      {header}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
        {hasShortfall && (
          <Box sx={{ color: 'error.main', display: 'flex', pt: '2px' }}>
            <AlertTriangle size={16} />
          </Box>
        )}
        <Typography variant="body2" color={hasShortfall ? 'error.main' : 'text.secondary'}>
          {summary}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.items.slice(0, VISIBLE_ITEMS).map(item => (
          <Box
            key={`${item.source}-${item.sourceId}-${item.date}`}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" noWrap display="block">
                {item.label}
              </Typography>
              <Typography
                variant="caption"
                color={item.isOverdue ? 'error.main' : 'text.secondary'}
              >
                {item.isOverdue ? t.overdue : item.date}
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
              {formatAmount(item.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      {data.unscheduledCommitted > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          {fillTemplate(text(t.unscheduled), {
            amount: formatAmount(data.unscheduledCommitted),
          })}
        </Typography>
      )}
    </Box>
  );
}
