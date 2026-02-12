import type { TourConfig } from './types';

/**
 * Files Storage page tour
 */
export function createStorageTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    search: { title: string; description: string };
    filters: { title: string; description: string };
    fileList: { title: string; description: string };
    actions: { title: string; description: string };
    categories: { title: string; description: string };
    permissions: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'storage-tour',
    name: texts.name ?? 'Storage Tour',
    description: texts.description ?? 'Managing files and access rights',
    page: '/storage',
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
        selector: '[data-tour-id="file-search"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.filters.title,
        description: texts.steps.filters.description,
        selector: '[data-tour-id="filters-button"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.fileList.title,
        description: texts.steps.fileList.description,
        selector: '[data-tour-id="file-list"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.actions.title,
        description: texts.steps.actions.description,
        selector: '[data-tour-id="file-actions"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.categories.title,
        description: texts.steps.categories.description,
        selector: '[data-tour-id="category-select"]',
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.permissions.title,
        description: texts.steps.permissions.description,
        selector: '[data-tour-id="permission-badge"]',
        side: 'left',
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
