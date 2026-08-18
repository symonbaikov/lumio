'use client';

import { ArrowDownRight, ArrowUpRight } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { NET_WORTH_RANGES, type NetWorthRange, useNetWorth } from '../hooks/useNetWorth';
import { AllocationCard } from './AllocationCard';
import { NetWorthChart } from './NetWorthChart';
import { RiskCard } from './RiskCard';

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
          aria-label={String(t.title)}
        >
          {NET_WORTH_RANGES.map(option => (
            <ToggleButton key={option} value={option} sx={{ px: 1.5, textTransform: 'none' }}>
              {option === 'all' ? t.rangeAll : option.toUpperCase()}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <Spinner size={32} />
        </Box>
      )}

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
            title={String(t.allocation)}
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
              title: String(t.riskTitle),
              riskyShare: String(t.riskyShare),
              riskyHint: String(t.riskyHint),
              unclassified: String(t.unclassified),
              risk: {
                low: String(t.riskLow),
                medium: String(t.riskMedium),
                high: String(t.riskHigh),
              },
              role: {
                income: String(t.roleIncome),
                neutral: String(t.roleNeutral),
                drain: String(t.roleDrain),
              },
            }}
            onClassify={(accountId, patch) => void classify(accountId, patch)}
          />
        </Box>
      )}
    </Box>
  );
}
