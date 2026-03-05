'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'financial' | 'operational' | 'tax';
  formats: Array<'pdf' | 'excel' | 'csv' | 'google-sheets'>;
}

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
  isSelected?: boolean;
}

export function ReportTemplateCard({ template, onSelect, isSelected }: ReportTemplateCardProps) {
  return (
    <Card
      className={`group cursor-pointer border bg-white shadow-sm rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected
          ? 'border-primary/40 ring-2 ring-primary/20 shadow-md'
          : 'border-slate-100 hover:border-primary/20'
      }`}
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <template.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">{template.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{template.description}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {template.formats.map(f => (
            <span
              key={f}
              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase font-medium"
            >
              {f}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
