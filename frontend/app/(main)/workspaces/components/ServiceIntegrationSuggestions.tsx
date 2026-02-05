'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ServiceIntegrationSuggestionsProps {
  onSkip: () => void;
  workspaceId: string;
}

const INTEGRATIONS = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Import bank statements directly from your Google Drive',
    icon: '/icons/google-drive-icon.png',
    path: '/integrations/google-drive',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Automatically extract receipts and invoices from emails',
    icon: '/icons/gmail.png',
    path: '/integrations/gmail',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export your financial data to Google Sheets',
    icon: '/icons/icons8-google-sheets-48.png',
    path: '/integrations/google-sheets',
  },
];

export function ServiceIntegrationSuggestions({
  onSkip,
  workspaceId,
}: ServiceIntegrationSuggestionsProps) {
  const router = useRouter();

  const handleConnect = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Connect Your Services
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enhance your workspace by connecting external services. You can always do this later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 relative">
                <Image
                  src={integration.icon}
                  alt={integration.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {integration.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {integration.description}
                </p>
                <button
                  type="button"
                  onClick={() => handleConnect(integration.path)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
