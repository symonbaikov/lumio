import type { TourConfig } from './types';

/**
 * Reports Tour — Report Builder
 */
export function createReportsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    tabs?: { title: string; description: string };
    templates: { title: string; description: string };
    selectTemplate: { title: string; description: string };
    generator: { title: string; description: string };
    format?: { title: string; description: string };
    formatSelector?: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  const tabsStep = texts.steps.tabs;
  const formatStep = texts.steps.format ?? texts.steps.formatSelector;

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
        title: tabsStep?.title ?? 'Report Tabs',
        description:
          tabsStep?.description ??
          'Use the report tabs to switch between available report workflows and views.',
        selector: '[data-tour-id="reports-tabs"]',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.templates.title,
        description: texts.steps.templates.description,
        selector: '[data-tour-id="reports-templates-grid"]',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.selectTemplate.title,
        description: texts.steps.selectTemplate.description,
        selector: '[data-tour-id="reports-template-pnl"]',
        side: 'bottom',
        align: 'start',
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
        title: formatStep?.title ?? 'Format',
        description:
          formatStep?.description ??
          'Choose the output format before generating or exporting the report.',
        selector: '[data-tour-id="reports-format"]',
        side: 'top',
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
