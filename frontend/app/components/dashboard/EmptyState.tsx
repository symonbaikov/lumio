'use client';

import { FileUp, Mail, PenLine } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  labels: {
    title: string;
    description: string;
    uploadCta: string;
    connectGmail: string;
    manualEntry: string;
    step1Label: string;
    step2Label: string;
    step3Label: string;
  };
}

export function EmptyState({ labels }: EmptyStateProps) {
  const steps = [
    { icon: FileUp, label: labels.step1Label },
    { icon: PenLine, label: labels.step2Label },
    { icon: Mail, label: labels.step3Label },
  ];

  return (
    <div className="flex flex-col items-center gap-8 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileUp className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{labels.title}</h2>
        <p className="max-w-md text-sm text-gray-500">{labels.description}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/statements/submit"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          {labels.uploadCta}
        </Link>
        <Link
          href="/integrations/gmail"
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          {labels.connectGmail}
        </Link>
        <Link
          href="/data-entry"
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          {labels.manualEntry}
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map(({ icon: Icon, label }, index) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Icon className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-xs font-semibold text-gray-900">{String(index + 1)}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
