'use client';

import { ArrowDownRight, ArrowUpRight } from '@/app/components/icons';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { NET_WORTH_RANGES, type NetWorthRange, useNetWorth } from '../hooks/useNetWorth';
import { AllocationCard } from './AllocationCard';
import { NetWorthChart } from './NetWorthChart';
import { RiskCard } from './RiskCard';

function NetWorthSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: tokens.radius.md,
          bgcolor: 'background.paper',
          p: 3,
        }}
      >
        <Skeleton variant="text" width={220} height={44} />
        <Skeleton variant="text" width={160} height={20} sx={{ mt: 1 }} />
        <Skeleton variant="rounded" height={220} sx={{ mt: 2, borderRadius: tokens.radius.md }} />
        <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
          <Box>
            <Skeleton variant="text" width={60} height={16} />
            <Skeleton variant="text" width={100} height={22} />
          </Box>
          <Box>
            <Skeleton variant="text" width={80} height={16} />
            <Skeleton variant="text" width={100} height={22} />
          </Box>
        </Box>
      </Box>
      <Skeleton variant="rounded" height={140} sx={{ borderRadius: tokens.radius.md }} />
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: tokens.radius.md }} />
    </Box>
  );
}

export function NetWorthContent() {
  const t = useIntlayer('netWorthPage');
  const { locale } = useLocale();
  const { data, loading, error, range, setRange, classify } = useNetWorth();

  const currency = data?.currency ?? 'KZT';
  const isPositive = (data?.change ?? 0) >= 0;
  const hasData = Boolean(data && (data.assetsTotal !== 0 || data.liabilitiesTotal !== 0));

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.subtitle}
          </Typography>
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_event, next: NetWorthRange | null) => next && setRange(next)}
          aria-label={t.title.value}
        >
          {NET_WORTH_RANGES.map(option => (
            <ToggleButton key={option} value={option} sx={{ px: 1.5, textTransform: 'none' }}>
              {option === 'all' ? t.rangeAll : option.toUpperCase()}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading && <NetWorthSkeleton />}

      {error && !loading && (
        <Typography color="error" sx={{ py: 6, textAlign: 'center' }}>
          {t.error}
        </Typography>
      )}

      {!loading && !error && data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: tokens.radius.md,
              bgcolor: 'background.paper',
              p: 3,
            }}
          >
            <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1.1 }}>
              {formatMoney(data.current, currency, locale)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
              {isPositive ? (
                <ArrowUpRight size={18} color={tokens.color.success} />
              ) : (
                <ArrowDownRight size={18} color={tokens.color.danger} />
              )}
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: isPositive ? 'success.main' : 'error.main' }}
              >
                {isPositive ? '+' : '−'}
                {formatMoney(Math.abs(data.change), currency, locale)}
                {data.changePercent !== null &&
                  ` (${isPositive ? '+' : '−'}${Math.abs(data.changePercent)}%)`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.overPeriod}
              </Typography>
            </Box>

            {hasData ? (
              <Box sx={{ mt: 2 }}>
                <NetWorthChart points={data.series} positive={isPositive} />
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}
              >
                {t.empty}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t.assets}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatMoney(data.assetsTotal, currency, locale)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t.liabilities}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatMoney(data.liabilitiesTotal, currency, locale)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <AllocationCard
            title={t.allocation.value}
            items={data.breakdown}
            currency={currency}
            locale={locale}
          />

          <RiskCard
            byRisk={data.byRisk}
            byRole={data.byRole}
            riskyPercent={data.riskyPercent}
            lines={data.assetLines}
            currency={currency}
            locale={locale}
            labels={{
              title: t.riskTitle.value,
              riskyShare: t.riskyShare.value,
              riskyHint: t.riskyHint.value,
              unclassified: t.unclassified.value,
              riskColumn: t.riskColumn.value,
              roleColumn: t.roleColumn.value,
              risk: {
                low: t.riskLow.value,
                medium: t.riskMedium.value,
                high: t.riskHigh.value,
              },
              role: {
                income: t.roleIncome.value,
                neutral: t.roleNeutral.value,
                drain: t.roleDrain.value,
              },
            }}
            onClassify={(accountId, patch) => void classify(accountId, patch)}
          />
        </Box>
      )}
    </Box>
  );
}
