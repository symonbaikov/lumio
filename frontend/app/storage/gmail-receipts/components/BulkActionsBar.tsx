'use client';

import apiClient from '@/app/lib/api';
import { Check, Download, X } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import React, { useState, useEffect } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkApprove: (categoryId?: string) => void;
  onExportToSheets: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  isEnabled?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onBulkApprove,
  onExportToSheets,
}: BulkActionsBarProps) {
  const content = useIntlayer('gmail-receipts-page');
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} {content.bulk.selected.value}
        </span>
        <button
          onClick={onClear}
          className="text-sm text-blue-700 hover:text-blue-900 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          {content.bulk.clearSelection.value}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {showCategorySelect ? (
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => {
                onBulkApprove(e.target.value || undefined);
                setShowCategorySelect(false);
              }}
            >
              <option value="">No category</option>
              {categories
                .filter(cat => cat.isEnabled !== false)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowCategorySelect(false)}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowCategorySelect(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {content.actions.bulkApprove.value}
            </button>
            <button
              onClick={onExportToSheets}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {content.actions.exportToSheets.value}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
