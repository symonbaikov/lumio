'use client';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Download, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import type { ReportTemplate } from './ReportTemplateCard';

export interface ReportGenerateParams {
  templateId: string;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel' | 'csv';
}

interface ReportGeneratorProps {
  template: ReportTemplate;
  onClose: () => void;
  onGenerate: (params: ReportGenerateParams) => Promise<void>;
}

const FORMAT_OPTIONS: Array<{ value: 'pdf' | 'excel' | 'csv'; label: string }> = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

export function ReportGenerator({ template, onClose, onGenerate }: ReportGeneratorProps) {
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');
  const [generating, setGenerating] = useState(false);

  const availableFormats = FORMAT_OPTIONS.filter(opt =>
    template.formats.includes(opt.value as 'pdf' | 'excel' | 'csv' | 'google-sheets'),
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate({ templateId: template.id, dateFrom, dateTo, format });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="mt-6 border border-primary/20 bg-white shadow-md rounded-[20px]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{template.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{template.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Date from */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="date-from"
              className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]"
            >
              Date from
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="date-to"
              className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]"
            >
              Date to
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Format */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
              Format
            </span>
            <div className="flex gap-2">
              {availableFormats.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                    format === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {opt.value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate &amp; Download
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
