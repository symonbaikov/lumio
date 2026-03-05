import type { TourConfig } from './types';

/**
 * Reports Tour — Report Builder
 */
export function createReportsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    templates: { title: string; description: string };
    selectTemplate: { title: string; description: string };
    generator: { title: string; description: string };
    formatSelector: { title: string; description: string };
    tabHistory: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'reports-tour',
    name: texts.name ?? 'Reports Tour',
    description: texts.description ?? 'Report Builder — generate and export financial reports',
    page: '/reports',
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
        title: texts.steps.templates.title,
        description: texts.steps.templates.description,
        selector: '[data-tour-id="reports-templates-grid"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.selectTemplate.title,
        description: texts.steps.selectTemplate.description,
        selector: '[data-tour-id="reports-template-pnl"]',
        side: 'bottom',
        align: 'start',
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="reports-template-pnl"]',
          event: 'click',
          delayMs: 250,
        },
      },
      {
        title: texts.steps.generator.title,
        description: texts.steps.generator.description,
        selector: '[data-tour-id="reports-generator"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.formatSelector.title,
        description: texts.steps.formatSelector.description,
        selector: '[data-tour-id="reports-generator-format"]',
        side: 'top',
        align: 'start',
      },
      {
        title: texts.steps.tabHistory.title,
        description: texts.steps.tabHistory.description,
        selector: '[data-tour-id="reports-tab-history"]',
        side: 'bottom',
        align: 'start',
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
