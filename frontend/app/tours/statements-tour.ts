/**
 * Statements page tour
 */

import type { TourConfig, TourStep } from './types';

/**
 * Creates tour configuration for the statements page
 * @param texts - Object with translations from useIntlayer
 */
export function createStatementsTour(texts: {
  name: { value: string };
  description: { value: string };
  steps: {
    welcome: { title: { value: string }; description: { value: string } };
    uploadButton: { title: { value: string }; description: { value: string } };
    searchBar: { title: { value: string }; description: { value: string } };
    statusFilter: { title: { value: string }; description: { value: string } };
    statementsTable: { title: { value: string }; description: { value: string } };
    statusBadges: { title: { value: string }; description: { value: string } };
    actions: { title: { value: string }; description: { value: string } };
    pagination: { title: { value: string }; description: { value: string } };
    completed: { title: { value: string }; description: { value: string } };
  };
}): TourConfig {
  const { steps } = texts;

  return {
    id: 'statements-tour',
    name: texts.name?.value ?? 'Statements Tour',
    description: texts.description?.value ?? 'Learn how to upload and manage bank statements',
    page: '/statements',
    steps: [
      {
        selector: 'body',
        title: steps.welcome.title.value,
        description: steps.welcome.description.value,
        side: 'center' as any,
      },
      {
        selector: '[data-tour-id="upload-button"]',
        title: steps.uploadButton.title.value,
        description: steps.uploadButton.description.value,
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="search-bar"]',
        title: steps.searchBar.title.value,
        description: steps.searchBar.description.value,
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="status-filter"]',
        title: steps.statusFilter.title.value,
        description: steps.statusFilter.description.value,
        side: 'bottom',
      },
      {
        selector: '[data-tour-id="statements-table"]',
        title: steps.statementsTable.title.value,
        description: steps.statementsTable.description.value,
        side: 'top',
      },
      {
        selector: '[data-tour-id="status-badge"]',
        title: steps.statusBadges.title.value,
        description: steps.statusBadges.description.value,
        side: 'left',
      },
      {
        selector: '[data-tour-id="action-buttons"]',
        title: steps.actions.title.value,
        description: steps.actions.description.value,
        side: 'left',
      },
      {
        selector: '[data-tour-id="pagination"]',
        title: steps.pagination.title.value,
        description: steps.pagination.description.value,
        side: 'top',
        align: 'center',
      },
      {
        selector: 'body',
        title: steps.completed.title.value,
        description: steps.completed.description.value,
        side: 'center' as any,
      },
    ],
  };
}
