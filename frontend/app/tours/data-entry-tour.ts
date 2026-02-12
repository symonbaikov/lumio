import type { TourConfig } from './types';

/**
 * Advanced Data Entry Tour
 */
export function createDataEntryTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    tabs: { title: string; description: string };
    tabsInfo: { title: string; description: string };
    editColumnsButton: { title: string; description: string };
    tableActionsButton: { title: string; description: string };
    tableActionsCreateForTab: { title: string; description: string };
    tableActionsCreateSingle: { title: string; description: string };
    tableActionsSyncLinked: { title: string; description: string };
    dateField: { title: string; description: string };
    amountField: { title: string; description: string };
    noteField: { title: string; description: string };
    currencyField: { title: string; description: string };
    currencyButtons: { title: string; description: string };
    saveButton: { title: string; description: string };
    entriesList: { title: string; description: string };
    searchEntries: { title: string; description: string };
    dateFilter: { title: string; description: string };
    customTab: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'data-entry-tour',
    name: texts.name ?? 'Data Entry Tour',
    description: texts.description ?? 'Review and edit transactions',
    page: '/data-entry',
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
        title: texts.steps.tabs.title,
        description: texts.steps.tabs.description,
        selector: '[data-tour-id="tabs-section"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.tabsInfo.title,
        description: texts.steps.tabsInfo.description,
        selector: '[data-tour-id="tabs-section"]',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.editColumnsButton.title,
        description: texts.steps.editColumnsButton.description,
        selector: '[data-tour-id="data-entry-edit-columns-button"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.tableActionsButton.title,
        description: texts.steps.tableActionsButton.description,
        selector: '[data-tour-id="data-entry-table-actions-button"]',
        side: 'left',
        align: 'center',
        showButtons: ['close', 'previous'],
        advanceOn: {
          selector: '[data-tour-id="data-entry-table-actions-button"]',
          event: 'click',
          delayMs: 200,
        },
      },
      {
        title: texts.steps.tableActionsCreateForTab.title,
        description: texts.steps.tableActionsCreateForTab.description,
        selector: '[data-tour-id="data-entry-table-actions-create-for-tab"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.tableActionsCreateSingle.title,
        description: texts.steps.tableActionsCreateSingle.description,
        selector: '[data-tour-id="data-entry-table-actions-create-single"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.tableActionsSyncLinked.title,
        description: texts.steps.tableActionsSyncLinked.description,
        selector: '[data-tour-id="data-entry-table-actions-sync-linked"]',
        side: 'left',
        align: 'center',
        optional: true,
      },
      {
        title: texts.steps.dateField.title,
        description: texts.steps.dateField.description,
        selector: '[data-tour-id="date-field"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.amountField.title,
        description: texts.steps.amountField.description,
        selector: '[data-tour-id="amount-field"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.noteField.title,
        description: texts.steps.noteField.description,
        selector: '[data-tour-id="note-field"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.currencyField.title,
        description: texts.steps.currencyField.description,
        selector: '[data-tour-id="currency-field"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.currencyButtons.title,
        description: texts.steps.currencyButtons.description,
        selector: '[data-tour-id="currency-buttons"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.saveButton.title,
        description: texts.steps.saveButton.description,
        selector: '[data-tour-id="save-entry-button"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.entriesList.title,
        description: texts.steps.entriesList.description,
        selector: '[data-tour-id="entries-list-section"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.searchEntries.title,
        description: texts.steps.searchEntries.description,
        selector: '[data-tour-id="search-entries"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.dateFilter.title,
        description: texts.steps.dateFilter.description,
        selector: '[data-tour-id="date-filter"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.customTab.title,
        description: texts.steps.customTab.description,
        selector: '[data-tour-id="custom-field-form"]',
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
