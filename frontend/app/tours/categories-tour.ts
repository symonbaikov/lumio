import type { TourConfig } from './types';

/**
 * Categories Tour
 */
export function createCategoriesTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    createButton: { title: string; description: string };
    categoriesList: { title: string; description: string };
    colorPicker: { title: string; description: string };
    iconPicker: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'categories-tour',
    name: texts.name ?? 'Categories Tour',
    description: texts.description ?? 'Organizing transactions and files',
    page: '/categories',
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
        title: texts.steps.createButton.title,
        description: texts.steps.createButton.description,
        selector: '[data-tour-id="create-category-button"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.categoriesList.title,
        description: texts.steps.categoriesList.description,
        selector: '[data-tour-id="categories-list"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.colorPicker.title,
        description: texts.steps.colorPicker.description,
        selector: '[data-tour-id="category-color"]',
        side: 'right',
        align: 'center',
      },
      {
        title: texts.steps.iconPicker.title,
        description: texts.steps.iconPicker.description,
        selector: '[data-tour-id="category-icon"]',
        side: 'right',
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
