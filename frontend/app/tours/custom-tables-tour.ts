import type { TourConfig } from './types';

/**
 * Custom Tables Tour - advanced guide
 */
export function createCustomTablesTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    search: { title: string; description: string };
    tabsAll: { title: string; description: string };
    tabsManual: { title: string; description: string };
    tabsGoogleSheets: { title: string; description: string };
    createButton: { title: string; description: string };
    createOptionEmpty: { title: string; description: string };
    createOptionFromStatement: { title: string; description: string };
    createOptionGoogleSheets: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'custom-tables-tour',
    name: texts.name ?? 'Custom Tables Tour',
    description: texts.description ?? 'Creating flexible data structures',
    page: '/custom-tables',
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
        title: texts.steps.search.title,
        description: texts.steps.search.description,
        selector: '[data-tour-id="custom-tables-search"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.tabsAll.title,
        description: texts.steps.tabsAll.description,
        selector: '[data-tour-id="custom-tables-source-tab-all"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.tabsManual.title,
        description: texts.steps.tabsManual.description,
        selector: '[data-tour-id="custom-tables-source-tab-manual"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.tabsGoogleSheets.title,
        description: texts.steps.tabsGoogleSheets.description,
        selector: '[data-tour-id="custom-tables-source-tab-google-sheets"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.createButton.title,
        description: texts.steps.createButton.description,
        selector: '[data-tour-id="custom-tables-create-button"]',
        side: 'bottom',
        align: 'end',
        // Important: user must click "Create" button manually
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="custom-tables-create-button"]',
          event: 'click',
          delayMs: 200,
        },
      },
      {
        title: texts.steps.createOptionEmpty.title,
        description: texts.steps.createOptionEmpty.description,
        selector: '[data-tour-id="custom-tables-create-empty"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.createOptionFromStatement.title,
        description: texts.steps.createOptionFromStatement.description,
        selector: '[data-tour-id="custom-tables-create-from-statement"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.createOptionGoogleSheets.title,
        description: texts.steps.createOptionGoogleSheets.description,
        selector: '[data-tour-id="custom-tables-create-import-google-sheets"]',
        side: 'right',
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
