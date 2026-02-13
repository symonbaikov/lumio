import type { TourConfig } from './types';

export function createGoogleSheetsIntegrationTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    step1Card: { title: string; description: string };
    sheetUrl: { title: string; description: string };
    sheetName: { title: string; description: string };
    worksheet: { title: string; description: string };
    connectButton: { title: string; description: string };
    step2Card: { title: string; description: string };
    appsScript: { title: string; description: string };
    listCard: { title: string; description: string };
    connectionCard: { title: string; description: string };
    authorize: { title: string; description: string };
    sync: { title: string; description: string };
    disconnect: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'google-sheets-integration-tour',
    name: texts.name ?? 'Google Sheets Integration Tour',
    description:
      texts.description ??
      'Step-by-step guide to connecting a table and setting up synchronization.',
    page: '/integrations/google-sheets',
    autoStart: false,
    steps: [
      {
        selector: '[data-tour-id="gs-integration-header"]',
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-step1"]',
        title: texts.steps.step1Card.title,
        description: texts.steps.step1Card.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-sheet-url"]',
        title: texts.steps.sheetUrl.title,
        description: texts.steps.sheetUrl.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-sheet-name"]',
        title: texts.steps.sheetName.title,
        description: texts.steps.sheetName.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-worksheet"]',
        title: texts.steps.worksheet.title,
        description: texts.steps.worksheet.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-connect"]',
        title: texts.steps.connectButton.title,
        description: texts.steps.connectButton.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-step2"]',
        title: texts.steps.step2Card.title,
        description: texts.steps.step2Card.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-apps-script"]',
        title: texts.steps.appsScript.title,
        description: texts.steps.appsScript.description,
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-list"]',
        title: texts.steps.listCard.title,
        description: texts.steps.listCard.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-connection-card"]',
        title: texts.steps.connectionCard.title,
        description: texts.steps.connectionCard.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-authorize"]',
        title: texts.steps.authorize.title,
        description: texts.steps.authorize.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-sync"]',
        title: texts.steps.sync.title,
        description: texts.steps.sync.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-disconnect"]',
        title: texts.steps.disconnect.title,
        description: texts.steps.disconnect.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-integration-list"]',
        title: texts.steps.completed.title,
        description: texts.steps.completed.description,
        side: 'top',
        align: 'start',
      },
    ],
  };
}
