/* eslint-disable max-lines */
'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useDashboardTrends } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export function TrendsTab({ formatAmount }: TrendsTabProps) {
  const t = useIntlayer('trendsTab');
  const [days, setDays] = useState<number>(30);
  const { resolvedTheme } = useTheme();
  const { data: trendsData, loading, error } = useDashboardTrends(days);
  const effectivePeriod = resolveDashboardEffectivePeriod(
    trendsData?.effectiveSince,
    trendsData?.effectiveEndDate,
  );

  // eslint-disable-next-line max-lines-per-function, complexity
  const dailyTrendOption = useMemo(() => {
    if (!trendsData?.dailyTrend?.length) return null;
    const isDark = resolvedTheme === 'dark';

    const actual = trendsData.dailyTrend;
    const forecast = trendsData.forecast ?? [];
    const hasForecast = forecast.length > 0;
    const lastActual = actual[actual.length - 1];

    const allDates = [...actual.map(p => p.date), ...forecast.map(p => p.date)];

    const incomeActual = [...actual.map(p => p.income), ...forecast.map(() => null)];
    const expenseActual = [...actual.map(p => p.expense), ...forecast.map(() => null)];

    const incomeForecast = hasForecast
      ? [...actual.slice(0, -1).map(() => null), lastActual.income, ...forecast.map(p => p.income)]
      : [];
    const expenseForecast = hasForecast
      ? [
          ...actual.slice(0, -1).map(() => null),
          lastActual.expense,
          ...forecast.map(p => p.expense),
        ]
      : [];

    const incomeColor = isDark ? '#34D399' : '#1a1a1a';
    const expenseColor = '#D13D56';
    const showPointSymbols = actual.length <= 2;

    const series: object[] = [
      {
        name: t.income.value,
        type: 'line',
        smooth: true,
        symbol: showPointSymbols ? 'circle' : 'none',
        symbolSize: showPointSymbols ? 7 : 0,
        showSymbol: showPointSymbols,
        data: incomeActual,
        areaStyle: { color: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(26,26,26,0.05)' },
        lineStyle: { color: incomeColor, width: 2 },
        itemStyle: { color: incomeColor },
        ...(hasForecast
          ? {
              markLine: {
                data: [{ xAxis: lastActual.date }],
                lineStyle: {
                  color: isDark ? '#4A5568' : '#A0AEC0',
                  type: 'dashed' as const,
                  width: 1,
                },
                label: {
                  show: true,
                  formatter: t.forecastLabel.value,
                  fontSize: 10,
                  color: isDark ? '#8899AA' : '#718096',
                  fontFamily: 'var(--font-dashboard-sans)',
                },
                symbol: 'none',
                silent: true,
              },
            }
          : {}),
      },
      {
        name: t.expense.value,
        type: 'line',
        smooth: true,
        symbol: showPointSymbols ? 'circle' : 'none',
        symbolSize: showPointSymbols ? 7 : 0,
        showSymbol: showPointSymbols,
        data: expenseActual,
        areaStyle: { color: 'rgba(209,61,86,0.08)' },
        lineStyle: { color: expenseColor, width: 2 },
        itemStyle: { color: expenseColor },
      },
    ];

    if (hasForecast) {
      series.push(
        {
          name: `${t.income.value}${t.forecastSuffix.value}`,
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: incomeForecast,
          areaStyle: { color: isDark ? 'rgba(52,211,153,0.05)' : 'rgba(26,26,26,0.02)' },
          lineStyle: { color: incomeColor, width: 2, type: 'dashed' as const },
          itemStyle: { color: incomeColor },
          legendHoverLink: false,
        },
        {
          name: `${t.expense.value}${t.forecastSuffix.value}`,
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: expenseForecast,
          areaStyle: { color: 'rgba(209,61,86,0.04)' },
          lineStyle: { color: expenseColor, width: 2, type: 'dashed' as const },
          itemStyle: { color: expenseColor },
          legendHoverLink: false,
        },
      );
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#151C24' : '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: isDark ? '#E2E8F0' : '#F5F3EF', fontSize: 12 },
      },
      legend: {
        data: [t.income.value, t.expense.value],
        top: 0,
        right: 0,
        textStyle: {
          color: isDark ? '#8899AA' : 'var(--muted-foreground)',
          fontSize: 11,
          fontFamily: 'var(--font-dashboard-sans)',
        },
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 6,
      },
      grid: { left: 40, right: 0, top: 40, bottom: 24 },
      xAxis: {
        type: 'category',
        data: allDates,
        axisLabel: {
          color: isDark ? '#8899AA' : 'var(--muted-foreground)',
          fontSize: 10,
          fontFamily: 'var(--font-dashboard-sans)',
        },
        axisLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: isDark ? '#8899AA' : 'var(--muted-foreground)',
          fontSize: 10,
          fontFamily: 'var(--font-dashboard-sans)',
        },
        splitLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
      },
      series,
    };
  }, [resolvedTheme, trendsData, t]);

  // eslint-disable-next-line max-lines-per-function, complexity
  const rosePieOption = useMemo(() => {
    if (!trendsData?.categories?.length) return null;
    const top10 = trendsData.categories.slice(0, 10);
    const isDark = resolvedTheme === 'dark';
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#151C24' : '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: isDark ? '#E2E8F0' : '#F5F3EF', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: {
          color: isDark ? '#8899AA' : 'var(--muted-foreground)',
          fontSize: 11,
          fontFamily: 'var(--font-dashboard-sans)',
        },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          name: t.expenseCategoriesSeriesName.value,
          type: 'pie',
          radius: ['20%', '60%'],
          center: ['50%', '45%'],
          roseType: 'radius',
          label: { show: false },
          data: top10.map(c => ({ name: c.name, value: Number(c.amount.toFixed(2)) })),
        },
      ],
    };
  }, [resolvedTheme, trendsData, t]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: '40px' }}>
      {effectivePeriod ? (
        <Box
          sx={{
            border: '1px solid var(--border)',
            borderRadius: tokens.radius.sm,
            bgcolor: 'var(--muted)',
            px: 2,
            py: 1.5,
            fontSize: 12,
            color: 'text.secondary',
            fontFamily: 'var(--font-dashboard-sans)',
          }}
        >
          {`${t.showingPeriodPrefix.value} ${effectivePeriod}`}
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          component="h1"
          sx={{
            fontSize: 30,
            fontWeight: 700,
            color: 'text.primary',
            fontFamily: 'var(--font-dashboard-mono)',
          }}
        >
          {t.title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1px',
              transition: 'background-color 150ms, color 150ms',
              cursor: 'pointer',
              border: days === opt.value ? 'none' : '1px solid var(--border)',
              borderRadius: tokens.radius.xs,
              backgroundColor: days === opt.value ? 'var(--primary-fill)' : 'var(--card)',
              color: days === opt.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              fontFamily: 'var(--font-dashboard-mono)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <Typography
            sx={{ fontSize: 13, color: 'error.main', fontFamily: 'var(--font-dashboard-sans)' }}
          >
            {error}
          </Typography>
        </Box>
      )}

      {!loading && !error && !trendsData && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <Typography
            sx={{ fontSize: 13, color: 'text.secondary', fontFamily: 'var(--font-dashboard-sans)' }}
          >
            {t.noTrendDataForPeriod}
          </Typography>
        </Box>
      )}

      {!loading && !error && trendsData && (
        <>
          <Box
            component="section"
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}
          >
            <Typography
              component="h2"
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '1px',
                color: 'text.secondary',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-dashboard-mono)',
              }}
            >
              {t.dataSourcesTitle}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  border: '1px solid var(--border)',
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'var(--card)',
                  p: 3,
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'text.primary',
                    fontFamily: 'var(--font-dashboard-mono)',
                  }}
                >
                  {t.statementsTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {t.income}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {formatAmount(trendsData.sources.statements.income)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {t.expense}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {formatAmount(trendsData.sources.statements.expense)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'success.main',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-dashboard-mono)',
                    }}
                  >
                    {t.syncedBadge}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  border: '1px solid var(--border)',
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'var(--card)',
                  p: 3,
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'text.primary',
                    fontFamily: 'var(--font-dashboard-mono)',
                  }}
                >
                  {t.netFlowTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {t.net}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {formatAmount(
                        Math.abs(
                          trendsData.sources.statements.income -
                            trendsData.sources.statements.expense,
                        ),
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {t.categories}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {trendsData.categories.length}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-dashboard-mono)',
                    }}
                  >
                    {t.activeBadge}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  border: '1px solid var(--border)',
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'var(--card)',
                  p: 3,
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'text.primary',
                    fontFamily: 'var(--font-dashboard-mono)',
                  }}
                >
                  {t.counterpartiesTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {t.totalFound}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        fontFamily: 'var(--font-dashboard-sans)',
                      }}
                    >
                      {trendsData.counterparties.length}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'text.secondary',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-dashboard-mono)',
                    }}
                  >
                    {t.readyBadge}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            component="section"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
              gap: 2.5,
              alignItems: 'start',
              mt: 2,
            }}
          >
            <Box
              sx={{
                gridColumn: { xs: '1', lg: 'span 8' },
                display: 'flex',
                height: '100%',
                flexDirection: 'column',
                gap: 1.5,
                border: '1px solid var(--border)',
                bgcolor: 'var(--card)',
                p: 3,
              }}
            >
              <Typography
                component="h3"
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'text.primary',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-dashboard-mono)',
                }}
              >
                {t.spendTrendTitle}
              </Typography>
              {dailyTrendOption ? (
                <Box sx={{ flex: 1, minHeight: 280 }}>
                  <ReactECharts
                    option={dailyTrendOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    height: 280,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: 'text.secondary',
                      fontFamily: 'var(--font-dashboard-sans)',
                    }}
                  >
                    {t.noTrendDataForRange}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              sx={{
                gridColumn: { xs: '1', lg: 'span 4' },
                display: 'flex',
                height: '100%',
                flexDirection: 'column',
                gap: 1.5,
                border: '1px solid var(--border)',
                bgcolor: 'var(--card)',
                p: 3,
              }}
            >
              <Typography
                component="h3"
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'text.primary',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-dashboard-mono)',
                }}
              >
                {t.categoryBreakdownTitle}
              </Typography>
              {rosePieOption ? (
                <Box sx={{ flex: 1, minHeight: 280 }}>
                  <ReactECharts
                    option={rosePieOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    height: 280,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: 'text.secondary',
                      fontFamily: 'var(--font-dashboard-sans)',
                    }}
                  >
                    {t.noCategorizedTransactions}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
