'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { ArrowDownRight, ArrowUpRight } from '@/app/components/icons';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { useAttentionFocus } from '@/app/hooks/useAttentionFocus';
import { useIntlayer, useLocale } from '@/app/i18n';
import { FALLBACK_CURRENCY } from '@/app/lib/currency';
import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import { NET_WORTH_RANGES, type NetWorthRange, useNetWorth } from '../hooks/useNetWorth';
import { AllocationCard } from './AllocationCard';
import { ASSET_CLASS_KEYS, InvestmentsCard } from './InvestmentsCard';
import { MetalsCard } from './MetalsCard';
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
  useAttentionFocus();
  const { locale } = useLocale();
  const {
    data,
    isPending,
    isFetching,
    error,
    range,
    setRange,
    denominate,
    setDenominate,
    classify,
  } = useNetWorth();

  const currency = data?.currency ?? FALLBACK_CURRENCY;
  // Measured in metal, the figures are ounces; the money ones stay untouched
  // underneath, so the toggle changes the unit and nothing else.
  const inMetal = denominate ? (data?.denominated ?? null) : null;
  const formatOunces = (value: number) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ozt`;
  const show = (value: number) =>
    inMetal ? formatOunces(value) : formatMoney(value, currency, locale);
  const headline = inMetal ?? data;
  const isPositive = (headline?.change ?? 0) >= 0;
  const hasData = Boolean(data && (data.assetsTotal !== 0 || data.liabilitiesTotal !== 0));

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pt: 'var(--lumio-page-top, 24px)', pb: 3, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={denominate ?? 'money'}
          onChange={(_event, next: string | null) =>
            next && setDenominate(next === 'money' ? null : 'XAU')
          }
          aria-label={t.ouncesOfGold.value}
        >
          <ToggleButton value="money" sx={{ px: 1.5, textTransform: 'none' }}>
            {currency}
          </ToggleButton>
          <ToggleButton value="XAU" sx={{ px: 1.5, textTransform: 'none' }}>
            {t.ouncesOfGold}
          </ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_event, next: NetWorthRange | null) => next && setRange(next)}
          aria-label={t.title.value}
        >
          {NET_WORTH_RANGES.map(option => (
            <ToggleButton key={option} value={option} sx={{ px: 1.5, textTransform: 'none' }}>
              {option === 'all' ? t.rangeAll : option.toUpperCase().replace('180D', '6M')}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {isPending && <NetWorthSkeleton />}

      {error && (
        <Typography color="error" sx={{ py: 2, textAlign: 'center' }}>
          {t.error}
        </Typography>
      )}

      {data && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            // Фоновое обновление не гасит карточки скелетоном — только приглушает.
            opacity: isFetching ? 0.6 : 1,
            transition: 'opacity 150ms ease',
          }}
        >
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
              {show(headline?.current ?? 0)}
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
                {show(Math.abs(headline?.change ?? 0))}
                {headline?.changePercent != null &&
                  ` (${isPositive ? '+' : '−'}${Math.abs(headline.changePercent)}%)`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.overPeriod}
              </Typography>
            </Box>
            {denominate && !inMetal && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {t.noMetalPrice}
              </Typography>
            )}
            {!inMetal && data.allTimeHigh && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {t.allTimeHigh.value
                  .replace('{{value}}', formatMoney(data.allTimeHigh.value, currency, locale))
                  .replace('{{date}}', data.allTimeHigh.date)}
              </Typography>
            )}

            {data.missingRates && data.missingRates.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {`${t.missingRates.value}: ${data.missingRates.join(', ')}`}
              </Alert>
            )}

            {hasData ? (
              <Box sx={{ mt: 2 }}>
                <NetWorthChart
                  points={inMetal ? inMetal.series : data.series}
                  positive={isPositive}
                  formatValue={show}
                />
              </Box>
            ) : (
              <EmptyState illustration="net-worth" description={t.empty} compact />
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

          <AllocationCard
            title={t.assetClasses.value}
            items={(data.byAssetClass ?? []).map(item => ({
              code: item.key ?? 'other',
              name: t[
                ASSET_CLASS_KEYS[
                  (item.key ?? 'other') as keyof typeof ASSET_CLASS_KEYS
                ] as 'classOther'
              ].value,
              amount: item.amount,
              percent: item.percent,
            }))}
            currency={currency}
            locale={locale}
          />

          <InvestmentsCard currency={currency} locale={locale} />

          <MetalsCard currency={currency} locale={locale} />

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
            onClassify={classify}
          />
        </Box>
      )}
    </Box>
  );
}
