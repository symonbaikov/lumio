'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import apiClient from '@/app/lib/api';
import { BarChart3, DollarSign, PieChart, Scale } from 'lucide-react';
import { useState } from 'react';
import BalanceSheet from './components/BalanceSheet';
import { ReportGenerator, type ReportGenerateParams } from './components/ReportGenerator';
import { ReportHistory } from './components/ReportHistory';
import { type ReportTemplate, ReportTemplateCard } from './components/ReportTemplateCard';

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'pnl',
    name: 'Profit & Loss (P&L)',
    description: 'Income and expenses summary with net profit for a period',
    icon: DollarSign,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities and equity snapshot',
    icon: Scale,
    category: 'financial',
    formats: ['pdf', 'excel'],
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Cash inflows and outflows over a period',
    icon: BarChart3,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'expense-by-category',
    name: 'Expense by Category',
    description: 'Breakdown of expenses by category with totals',
    icon: PieChart,
    category: 'operational',
    formats: ['pdf', 'excel', 'csv'],
  },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<'templates' | 'history'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);

  const handleSelectTemplate = (template: ReportTemplate) => {
    if (template.id === 'balance-sheet') {
      setShowBalanceSheet(true);
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template));
  };

  const handleGenerate = async (params: ReportGenerateParams) => {
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
      <div className="min-h-screen">
        <div className="px-8 pt-8 pb-6">
          <button
            type="button"
            onClick={() => setShowBalanceSheet(false)}
            className="mb-4 text-sm font-medium text-[#0a66c2] hover:text-[#004182] transition-colors"
          >
            ← Back to templates
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
        </div>
        <div className="px-8 pb-8">
          <BalanceSheet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-8 pt-8 pb-0">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate financial reports and export documents
        </p>
      </div>

      <div className="px-8 border-b border-slate-200 mt-4">
        <Tabs
          value={tab}
          onChange={(_e, v: 'templates' | 'history') => {
            setTab(v);
            setSelectedTemplate(null);
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#64748b',
              minHeight: 48,
              '&.Mui-selected': { color: '#0a66c2' },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#0a66c2' },
          }}
        >
          <Tab value="templates" label="Templates" />
          <Tab value="history" label="History" />
        </Tabs>
      </div>

      <div className="px-8 py-6">
        {tab === 'templates' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATES.map(tmpl => (
                <ReportTemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onSelect={handleSelectTemplate}
                  isSelected={selectedTemplate?.id === tmpl.id}
                />
              ))}
            </div>
            {selectedTemplate && (
              <ReportGenerator
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
                onGenerate={handleGenerate}
              />
            )}
          </>
        )}
        {tab === 'history' && <ReportHistory />}
      </div>
    </div>
  );
}
