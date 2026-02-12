import type { TourConfig } from './types';

/**
 * Integrations Tour
 */
export function createIntegrationsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    googleSheets: { title: string; description: string };
    apiKeys: { title: string; description: string };
    webhooks: { title: string; description: string };
    connectionStatus: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'integrations-tour',
    name: texts.name ?? 'Integrations Tour',
    description: texts.description ?? 'Connecting external services',
    page: '/integrations',
    autoStart: false,
    steps: [
      {
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.googleSheets.title,
        description: texts.steps.googleSheets.description,
        selector: '[data-tour-id="google-sheets-integration"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.apiKeys.title,
        description: texts.steps.apiKeys.description,
        selector: '[data-tour-id="api-keys"]',
        side: 'right',
        align: 'center',
      },
      {
        title: texts.steps.webhooks.title,
        description: texts.steps.webhooks.description,
        selector: '[data-tour-id="webhooks"]',
        side: 'right',
        align: 'center',
      },
      {
        title: texts.steps.connectionStatus.title,
        description: texts.steps.connectionStatus.description,
        selector: '[data-tour-id="connection-status"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.completed.title,
        description: texts.steps.completed.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
    ],
  };
}
