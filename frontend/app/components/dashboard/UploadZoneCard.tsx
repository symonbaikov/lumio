'use client';

import { FileUp } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import Link from 'next/link';
import type React from 'react';

const FORMATS = ['PDF', 'CSV', 'XLSX', 'JPG/PNG'];

/** Drop-zone style shortcut to the statement scanner. */
export function UploadZoneCard(): React.JSX.Element {
  const t = useIntlayer('quickActionsCard');
  return (
    <section className="lumio-dashboard__card lumio-dashboard__card--flush">
      <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__upload-zone">
        <div className="lumio-dashboard__upload-ico">
          <FileUp size={20} />
        </div>
        <div className="lumio-dashboard__upload-title">{t.uploadDropTitle}</div>
        <div className="lumio-dashboard__upload-sub">{t.uploadDropSub}</div>
        <div className="lumio-dashboard__upload-formats">
          {FORMATS.map(format => (
            <span key={format} className="lumio-dashboard__format-tag">
              {format}
            </span>
          ))}
        </div>
      </Link>
    </section>
  );
}
