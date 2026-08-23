'use client';

import { BarChart3, CalendarDays, DollarSign, List, PieChart, Scale } from '@/app/components/icons';
import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useState } from 'react';
import BalanceSheet from './components/BalanceSheet';
import { type ReportGenerateParams, ReportGenerator } from './components/ReportGenerator';
import { ReportHistory } from './components/ReportHistory';
import { ReportSchedules } from './components/ReportSchedules';
import { type ReportTemplate, ReportTemplateCard } from './components/ReportTemplateCard';

// eslint-disable-next-line max-lines-per-function
export default function ReportsPage(): React.JSX.Element {
  const t = useIntlayer('reportsPage');
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  // eslint-disable-next-line max-params
  const text = (key: string, fallback: string): string => labels[key]?.value ?? fallback;

  const templates: ReportTemplate[] = [
    {
      id: 'pnl',
      name: text('templatePnlName', 'Profit & Loss (P&L)'),
      description: text(
        'templatePnlDescription',
        'Income and expenses summary with net profit for a period',
      ),
      icon: DollarSign,
      category: 'financial',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'balance-sheet',
      name: text('templateBalanceName', 'Balance Sheet'),
      description: text('templateBalanceDescription', 'Assets, liabilities and equity snapshot'),
      icon: Scale,
      category: 'financial',
      formats: ['pdf', 'excel'],
    },
    {
      id: 'cash-flow',
      name: text('templateCashFlowName', 'Cash Flow Statement'),
      description: text('templateCashFlowDescription', 'Cash inflows and outflows over a period'),
      icon: BarChart3,
      category: 'financial',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'expense-by-category',
      name: text('templateExpenseByCategoryName', 'Expense by Category'),
      description: text(
        'templateExpenseByCategoryDescription',
        'Breakdown of expenses by category with totals',
      ),
      icon: PieChart,
      category: 'operational',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'transaction-register',
      name: text('templateTransactionRegisterName', 'Transaction Register'),
      description: text(
        'templateTransactionRegisterDescription',
        'Every transaction in the period with converted and original amounts',
      ),
      icon: List,
      category: 'operational',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'monthly-summary',
      name: text('templateMonthlySummaryName', 'Monthly Summary'),
      description: text(
        'templateMonthlySummaryDescription',
        'Income, expenses, savings rate and top categories on one page',
      ),
      icon: CalendarDays,
      category: 'financial',
      formats: ['pdf', 'excel', 'csv'],
    },
  ];

  const [tab, setTab] = useState<'templates' | 'history' | 'schedules'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);

  const handleSelectTemplate = (template: ReportTemplate): void => {
    if (template.id === 'balance-sheet') {
      setShowBalanceSheet(true);
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template));
  };

  const handleGenerate = async (params: ReportGenerateParams): Promise<void> => {
    const response = await apiClient.post('/reports/generate', params, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.templateId}-report.${params.format === 'excel' ? 'xlsx' : params.format}`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSelectedTemplate(null);
  };

  if (showBalanceSheet) {
    return (
      <Box>
        <Box sx={{ px: { xs: 2, sm: 4 }, pt: 4, pb: 3 }}>
          <button
            type="button"
            onClick={() => setShowBalanceSheet(false)}
            style={{
              marginBottom: 16,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ← {text('backToTemplates', 'Back to templates')}
          </button>
          <Typography variant="h5" fontWeight={700}>
            {text('balanceSheetTitle', 'Balance Sheet')}
          </Typography>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 4 }, pb: 4 }}>
          <BalanceSheet />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 4, pb: 0 }}>
        <Typography variant="h5" fontWeight={700}>
          {text('title', 'Reports')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'var(--muted-foreground)' }}>
          {text('subtitle', 'Generate financial reports and export documents')}
        </Typography>
      </Box>

      <Box sx={{ mt: 2, borderBottom: '1px solid var(--border)', px: { xs: 2, sm: 4 } }}>
        <Tabs
          data-tour-id="reports-tabs"
          value={tab}
          // eslint-disable-next-line max-params
          onChange={(_e, v: 'templates' | 'history' | 'schedules') => {
            setTab(v);
            setSelectedTemplate(null);
          }}
          variant="scrollable"
          scrollButtons={false}
          sx={sharedMuiTabsSx}
        >
          <Tab value="templates" label={text('tabTemplates', 'Templates')} />
          <Tab
            value="schedules"
            label={text('tabSchedules', 'Schedules')}
            data-tour-id="reports-schedules-tab"
          />
          <Tab
            value="history"
            label={text('tabHistory', 'History')}
            data-tour-id="reports-history-tab"
          />
        </Tabs>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
        {tab === 'templates' && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 2,
              }}
              data-tour-id="reports-templates-grid"
            >
              {templates.map(tmpl => (
                <ReportTemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onSelect={handleSelectTemplate}
                  isSelected={selectedTemplate?.id === tmpl.id}
                />
              ))}
            </Box>
            {selectedTemplate && (
              <ReportGenerator
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
                onGenerate={handleGenerate}
              />
            )}
          </>
        )}
        {tab === 'schedules' && (
          <ReportSchedules templates={templates.map(tmpl => ({ id: tmpl.id, name: tmpl.name }))} />
        )}
        {tab === 'history' && <ReportHistory />}
      </Box>
    </Box>
  );
}
