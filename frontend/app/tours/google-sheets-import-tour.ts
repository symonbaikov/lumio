import type { TourConfig } from './types';

export function createGoogleSheetsImportTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    backLink: { title: string; description: string };
    sourceCard: { title: string; description: string };
    connection: { title: string; description: string };
    worksheet: { title: string; description: string };
    range: { title: string; description: string };
    headerOffset: { title: string; description: string };
    layout: { title: string; description: string };
    previewButton: { title: string; description: string };
    previewPanel: { title: string; description: string };
    columnsPanel: { title: string; description: string };
    enableAll: { title: string; description: string };
    resultCard: { title: string; description: string };
    tableName: { title: string; description: string };
    category: { title: string; description: string };
    importData: { title: string; description: string };
    importButton: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'google-sheets-import-tour',
    name: texts.name ?? 'Google Sheets Import Tour',
    description:
      texts.description ?? 'Step-by-step overview of import settings and table creation.',
    page: '/custom-tables/import/google-sheets',
    autoStart: false,
    steps: [
      {
        selector: '[data-tour-id="gs-import-header"]',
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-back"]',
        title: texts.steps.backLink.title,
        description: texts.steps.backLink.description,
        side: 'left',
        align: 'center',
      },
      {
        selector: '[data-tour-id="gs-import-source-card"]',
        title: texts.steps.sourceCard.title,
        description: texts.steps.sourceCard.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-connection"]',
        title: texts.steps.connection.title,
        description: texts.steps.connection.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-worksheet"]',
        title: texts.steps.worksheet.title,
        description: texts.steps.worksheet.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-range"]',
        title: texts.steps.range.title,
        description: texts.steps.range.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-header-offset"]',
        title: texts.steps.headerOffset.title,
        description: texts.steps.headerOffset.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-layout"]',
        title: texts.steps.layout.title,
        description: texts.steps.layout.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-preview-button"]',
        title: texts.steps.previewButton.title,
        description: texts.steps.previewButton.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-preview-panel"]',
        title: texts.steps.previewPanel.title,
        description: texts.steps.previewPanel.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-columns-panel"]',
        title: texts.steps.columnsPanel.title,
        description: texts.steps.columnsPanel.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-enable-all"]',
        title: texts.steps.enableAll.title,
        description: texts.steps.enableAll.description,
        side: 'left',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-result-card"]',
        title: texts.steps.resultCard.title,
        description: texts.steps.resultCard.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-table-name"]',
        title: texts.steps.tableName.title,
        description: texts.steps.tableName.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-category"]',
        title: texts.steps.category.title,
        description: texts.steps.category.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-import-data"]',
        title: texts.steps.importData.title,
        description: texts.steps.importData.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-commit-button"]',
        title: texts.steps.importButton.title,
        description: texts.steps.importButton.description,
        side: 'right',
        align: 'start',
      },
      {
        selector: '[data-tour-id="gs-import-commit-button"]',
        title: texts.steps.completed.title,
        description: texts.steps.completed.description,
        side: 'top',
        align: 'start',
      },
    ],
  };
}
