'use client';

import { Badge } from '@/app/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import apiClient from '@/app/lib/api';

export interface ReportHistoryItem {
  id: string;
  templateId: string;
  templateName: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  downloadUrl: string;
  fileSize: number;
}

function getRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FORMAT_BADGE_CLASSES: Record<string, string> = {
  excel: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pdf: 'bg-rose-100 text-rose-700 border-rose-200',
  csv: 'bg-sky-100 text-sky-700 border-sky-200',
};

export function ReportHistory() {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/reports/history')
      .then(res => setHistory(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <FileText className="h-10 w-10 text-slate-200" />
        <p className="text-sm font-semibold text-slate-500">No reports generated yet</p>
        <p className="text-xs text-slate-400">
          Select a template and generate your first report.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Report
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Period
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Format
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Generated
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Size
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Download
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {history.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5">
                <span className="font-medium text-slate-900">{item.templateName}</span>
              </td>
              <td className="px-5 py-3.5 text-slate-500 text-xs">
                {item.dateFrom} – {item.dateTo}
              </td>
              <td className="px-5 py-3.5">
                <Badge
                  className={`text-[10px] font-semibold uppercase border px-2 py-0.5 ${FORMAT_BADGE_CLASSES[item.format] ?? 'bg-slate-100 text-slate-600'}`}
                >
                  {item.format}
                </Badge>
              </td>
              <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                {getRelativeTime(item.generatedAt)}
              </td>
              <td className="px-5 py-3.5 text-slate-400 text-xs">
                {formatFileSize(item.fileSize)}
              </td>
              <td className="px-5 py-3.5 text-right">
                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
