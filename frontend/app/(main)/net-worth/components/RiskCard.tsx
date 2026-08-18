'use client';

import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  CAPITAL_ROLES,
  type CapitalRole,
  type NetWorthAssetLine,
  type NetWorthClassificationItem,
  RISKY_ALLOCATION_THRESHOLD,
  RISK_LEVELS,
  type RiskLevel,
} from '../hooks/useNetWorth';

interface RiskCardLabels {
  title: string;
  riskyShare: string;
  riskyHint: string;
  unclassified: string;
  risk: Record<RiskLevel, string>;
  role: Record<CapitalRole, string>;
}

interface RiskCardProps {
  byRisk: NetWorthClassificationItem[];
  byRole: NetWorthClassificationItem[];
  riskyPercent: number;
  lines: NetWorthAssetLine[];
  currency: string;
  locale: string;
  labels: RiskCardLabels;
  onClassify: (
    accountId: string,
    patch: { capitalRole?: CapitalRole | null; riskLevel?: RiskLevel | null },
  ) => void;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: tokens.color.success,
  medium: tokens.color.warning,
  high: tokens.color.danger,
};

export function RiskCard({
  byRisk,
  byRole,
  riskyPercent,
  lines,
  currency,
  locale,
  labels,
  onClassify,
}: RiskCardProps) {
  if (lines.length === 0) {
    return null;
  }

  const money = (value: number) => formatMoney(value, currency, locale);
  const overThreshold = riskyPercent > RISKY_ALLOCATION_THRESHOLD;

  const riskLabel = (key: string | null) =>
    key === null ? labels.unclassified : labels.risk[key as RiskLevel];
  const roleLabel = (key: string | null) =>
    key === null ? labels.unclassified : labels.role[key as CapitalRole];

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.6 }}
        >
          {labels.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: overThreshold ? 'error.main' : 'success.main' }}
        >
          {labels.riskyShare}: {riskyPercent}%
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        {labels.riskyHint}
      </Typography>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
        <Summary items={byRisk} label={riskLabel} money={money} />
        <Summary items={byRole} label={roleLabel} money={money} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {lines.map(line => (
          <Box
            key={line.id}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="body2" sx={{ flex: '1 1 160px', minWidth: 0 }} noWrap>
              {line.name}
            </Typography>
            <Typography variant="body2" sx={{ flex: '0 0 auto', fontWeight: 600 }}>
              {money(line.amount)}
            </Typography>

            <TextField
              select
              size="small"
              // Cash is the zero-risk anchor, so its risk is shown but locked.
              disabled={!line.isClassifiable}
              value={line.riskLevel ?? ''}
              onChange={event =>
                onClassify(line.id, { riskLevel: (event.target.value || null) as RiskLevel | null })
              }
              sx={{ flex: '0 0 150px' }}
            >
              <MenuItem value="">{labels.unclassified}</MenuItem>
              {RISK_LEVELS.map(level => (
                <MenuItem key={level} value={level} sx={{ color: RISK_COLORS[level] }}>
                  {labels.risk[level]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              disabled={!line.isClassifiable}
              value={line.capitalRole ?? ''}
              onChange={event =>
                onClassify(line.id, {
                  capitalRole: (event.target.value || null) as CapitalRole | null,
                })
              }
              sx={{ flex: '0 0 150px' }}
            >
              <MenuItem value="">{labels.unclassified}</MenuItem>
              {CAPITAL_ROLES.map(role => (
                <MenuItem key={role} value={role}>
                  {labels.role[role]}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Summary({
  items,
  label,
  money,
}: {
  items: NetWorthClassificationItem[];
  label: (key: string | null) => string;
  money: (value: number) => string;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
      {items.map(item => (
        <Box key={String(item.key)} sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="body2" sx={{ flexGrow: 1, color: 'text.secondary' }}>
            {label(item.key)}
          </Typography>
          <Typography variant="body2">{item.percent}%</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {money(item.amount)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
