import type { TourConfig } from './types';

/**
 * Reports Tour
 */
export function createReportsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    tabsOverview: { title: string; description: string };

    tabSheetsClick: { title: string; description: string };
    sheetsDays: { title: string; description: string };
    sheetsTotals: { title: string; description: string };
    sheetsTrend: { title: string; description: string };
    sheetsExpenseCategories: { title: string; description: string };
    sheetsIncomeCounterparty: { title: string; description: string };
    sheetsLastOperations: { title: string; description: string };

    tabLocalClick: { title: string; description: string };
    localTables: { title: string; description: string };
    localDays: { title: string; description: string };
    localTotals: { title: string; description: string };
    localTrend: { title: string; description: string };
    localExpenseCategories: { title: string; description: string };
    localIncomeCounterparty: { title: string; description: string };
    localLastOperations: { title: string; description: string };

    tabStatementsClick: { title: string; description: string };
    statementsRefresh: { title: string; description: string };
    statementsPipeline: { title: string; description: string };
    statementsTotals: { title: string; description: string };
    statementsUploadsTrend: { title: string; description: string };
    statementsBanks: { title: string; description: string };
    statementsStatuses: { title: string; description: string };
    statementsLatestUploads: { title: string; description: string };

    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'reports-tour',
    name: texts.name ?? 'Reports Tour',
    description: texts.description ?? 'Financial analysis and data visualization',
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
        title: texts.steps.tabsOverview.title,
        description: texts.steps.tabsOverview.description,
        selector: '[data-tour-id="reports-tabs"]',
        side: 'bottom',
        align: 'start',
      },

      // Google Sheets tab
      {
        title: texts.steps.tabSheetsClick.title,
        description: texts.steps.tabSheetsClick.description,
        selector: '[data-tour-id="reports-tab-sheets"]',
        side: 'bottom',
        align: 'start',
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="reports-tab-sheets"]',
          event: 'click',
          delayMs: 250,
        },
      },
      {
        title: texts.steps.sheetsDays.title,
        description: texts.steps.sheetsDays.description,
        selector: '[data-tour-id="reports-sheets-days"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.sheetsTotals.title,
        description: texts.steps.sheetsTotals.description,
        selector: '[data-tour-id="reports-sheets-totals"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.sheetsTrend.title,
        description: texts.steps.sheetsTrend.description,
        selector: '[data-tour-id="reports-sheets-trend"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.sheetsExpenseCategories.title,
        description: texts.steps.sheetsExpenseCategories.description,
        selector: '[data-tour-id="reports-sheets-expense-categories"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.sheetsIncomeCounterparty.title,
        description: texts.steps.sheetsIncomeCounterparty.description,
        selector: '[data-tour-id="reports-sheets-income-counterparty"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.sheetsLastOperations.title,
        description: texts.steps.sheetsLastOperations.description,
        selector: '[data-tour-id="reports-sheets-last-operations"]',
        side: 'top',
        align: 'center',
      },

      // Local (Custom Tables) tab
      {
        title: texts.steps.tabLocalClick.title,
        description: texts.steps.tabLocalClick.description,
        selector: '[data-tour-id="reports-tab-local"]',
        side: 'bottom',
        align: 'start',
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="reports-tab-local"]',
          event: 'click',
          delayMs: 250,
        },
      },
      {
        title: texts.steps.localTables.title,
        description: texts.steps.localTables.description,
        selector: '[data-tour-id="reports-local-tables"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.localDays.title,
        description: texts.steps.localDays.description,
        selector: '[data-tour-id="reports-local-days"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.localTotals.title,
        description: texts.steps.localTotals.description,
        selector: '[data-tour-id="reports-local-totals"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.localTrend.title,
        description: texts.steps.localTrend.description,
        selector: '[data-tour-id="reports-local-trend"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.localExpenseCategories.title,
        description: texts.steps.localExpenseCategories.description,
        selector: '[data-tour-id="reports-local-expense-categories"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.localIncomeCounterparty.title,
        description: texts.steps.localIncomeCounterparty.description,
        selector: '[data-tour-id="reports-local-income-counterparty"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.localLastOperations.title,
        description: texts.steps.localLastOperations.description,
        selector: '[data-tour-id="reports-local-last-operations"]',
        side: 'top',
        align: 'center',
      },

      // Statements tab
      {
        title: texts.steps.tabStatementsClick.title,
        description: texts.steps.tabStatementsClick.description,
        selector: '[data-tour-id="reports-tab-statements"]',
        side: 'bottom',
        align: 'start',
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="reports-tab-statements"]',
          event: 'click',
          delayMs: 250,
        },
      },
      {
        title: texts.steps.statementsRefresh.title,
        description: texts.steps.statementsRefresh.description,
        selector: '[data-tour-id="reports-statements-refresh"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.statementsPipeline.title,
        description: texts.steps.statementsPipeline.description,
        selector: '[data-tour-id="reports-statements-pipeline"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.statementsTotals.title,
        description: texts.steps.statementsTotals.description,
        selector: '[data-tour-id="reports-statements-totals"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.statementsUploadsTrend.title,
        description: texts.steps.statementsUploadsTrend.description,
        selector: '[data-tour-id="reports-statements-uploads-trend"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.statementsBanks.title,
        description: texts.steps.statementsBanks.description,
        selector: '[data-tour-id="reports-statements-banks"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.statementsStatuses.title,
        description: texts.steps.statementsStatuses.description,
        selector: '[data-tour-id="reports-statements-statuses"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.statementsLatestUploads.title,
        description: texts.steps.statementsLatestUploads.description,
        selector: '[data-tour-id="reports-statements-latest-uploads"]',
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
