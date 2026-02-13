'use client';

import type { AuditEventDiff } from '@/lib/api/audit';
import React from 'react';

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function DiffViewer({ diff }: { diff: AuditEventDiff | null }) {
  if (!diff) {
    return <div className="text-sm text-gray-500">No diff available.</div>;
  }

  if (Array.isArray(diff)) {
    return (
      <div className="space-y-2">
        {diff.map((op, idx) => (
          <div key={idx} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="font-semibold text-gray-800">
              {op.op.toUpperCase()} {op.path}
            </div>
            {op.value !== undefined && (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                {formatValue(op.value)}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  }

  const before = diff.before || {};
  const after = diff.after || {};
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-3 gap-0 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
        <div className="px-3 py-2">Field</div>
        <div className="px-3 py-2">Before</div>
        <div className="px-3 py-2">After</div>
      </div>
      <div className="divide-y divide-gray-200">
        {keys.map(key => {
          const beforeValue = (before as any)?.[key];
          const afterValue = (after as any)?.[key];
          const hadBefore = Object.prototype.hasOwnProperty.call(before, key);
          const hadAfter = Object.prototype.hasOwnProperty.call(after, key);
          const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
          const rowClass =
            hadBefore && !hadAfter
              ? 'bg-red-50'
              : !hadBefore && hadAfter
                ? 'bg-green-50'
                : changed
                  ? 'bg-yellow-50'
                  : '';
          return (
            <div key={key} className={`grid grid-cols-3 gap-0 text-sm ${rowClass}`}>
              <div className="px-3 py-2 font-medium text-gray-700">{key}</div>
              <div className="px-3 py-2 text-gray-600">
                <pre className="whitespace-pre-wrap text-xs">{formatValue(beforeValue)}</pre>
              </div>
              <div className="px-3 py-2 text-gray-600">
                <pre className="whitespace-pre-wrap text-xs">{formatValue(afterValue)}</pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
