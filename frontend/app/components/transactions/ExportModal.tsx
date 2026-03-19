'use client';

import { useIntlayer } from '@/app/i18n';
import { FileSpreadsheet, Table } from 'lucide-react';
import React, { useState } from 'react';
import { ModalFooter, ModalShell } from '../ui/modal-shell';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (type: 'table' | 'excel' | 'csv') => void;
}

export default function ExportModal({ open, onClose, onExport }: ExportModalProps) {
  const [selectedType, setSelectedType] = useState<'table' | 'excel' | 'csv'>('table');
  const t = useIntlayer('exportModal');

  const handleConfirm = () => {
    onExport(selectedType);
    onClose();
  };

  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      title={t.title.value}
      size="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleConfirm}
          confirmText={t.exportButton.value}
          cancelText={t.cancel.value}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t.description.value}</p>

        <div className="grid gap-3">
          {/* Export to Table */}
          <label
            className={`relative flex cursor-pointer rounded-none border p-4 shadow-none focus:outline-none ${
              selectedType === 'table'
                ? 'border-primary border ring-primary'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="export-type"
              value="table"
              className="sr-only"
              checked={selectedType === 'table'}
              onChange={() => setSelectedType('table')}
            />
            <span className="flex flex-1">
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Table className="h-4 w-4 text-primary" />
                  {t.exportToTable.value}
                </span>
                <span className="mt-1 flex items-center text-xs text-gray-500">
                  {t.exportToTableDescription.value}
                </span>
              </span>
            </span>
            <span
              className={`h-4 w-4 rounded-full border border-gray-300 ${
                selectedType === 'table' ? 'border-primary bg-primary' : 'bg-transparent'
              }`}
            >
              {selectedType === 'table' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </span>
          </label>

          {/* Export to Excel */}
          <label
            className={`relative flex cursor-pointer rounded-none border p-4 shadow-none focus:outline-none ${
              selectedType === 'excel'
                ? 'border-primary border ring-primary'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="export-type"
              value="excel"
              className="sr-only"
              checked={selectedType === 'excel'}
              onChange={() => setSelectedType('excel')}
            />
            <span className="flex flex-1">
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel / CSV
                </span>
                <span className="mt-1 flex items-center text-xs text-gray-500">
                  {t.downloadFile.value}
                </span>
              </span>
            </span>
            <span
              className={`h-4 w-4 rounded-full border border-gray-300 ${
                selectedType === 'excel' ? 'border-primary bg-primary' : 'bg-transparent'
              }`}
            >
              {selectedType === 'excel' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </span>
          </label>
        </div>
      </div>
    </ModalShell>
  );
}
