/**
 * File upload tour via modal
 */

import type { TourConfig } from './types';

/**
 * Creates tour configuration for the upload modal
 * @param texts - Object with translations from useIntlayer
 */
export function createUploadTour(texts: {
  name: { value: string };
  description: { value: string };
  steps: {
    welcome: { title: { value: string }; description: { value: string } };
    uploadButton: { title: { value: string }; description: { value: string } };
    dragDrop: { title: { value: string }; description: { value: string } };
    allowDuplicates: { title: { value: string }; description: { value: string } };
    fileList: { title: { value: string }; description: { value: string } };
    uploadFiles: { title: { value: string }; description: { value: string } };
    completed: { title: { value: string }; description: { value: string } };
  };
}): TourConfig {
  const { steps } = texts;

  return {
    id: 'upload-tour',
    name: texts.name?.value ?? 'Upload Tour',
    description: texts.description?.value ?? 'Learn how to upload bank statements',
    page: '/statements',
    steps: [
      {
        selector: 'body',
        title: steps.welcome.title.value,
        description: steps.welcome.description.value,
        side: 'center' as any,
      },
      {
        selector: '[data-tour-id="upload-statement-button"]',
        title: steps.uploadButton.title.value,
        description: steps.uploadButton.description.value,
        side: 'bottom',
        align: 'end',
      },
      {
        selector: '.fixed.inset-0 .bg-white.rounded-3xl',
        title: steps.dragDrop.title.value,
        description: steps.dragDrop.description.value,
        side: 'bottom',
        align: 'center',
      },
      {
        selector: '#allow-duplicates',
        title: steps.allowDuplicates.title.value,
        description: steps.allowDuplicates.description.value,
        side: 'right',
      },
      {
        selector: '.fixed.inset-0 .bg-white.rounded-3xl .flex.flex-col.gap-2',
        title: steps.fileList.title.value,
        description: steps.fileList.description.value,
        side: 'top',
      },
      {
        selector: '.fixed.inset-0 .bg-white.rounded-3xl button.bg-primary',
        title: steps.uploadFiles.title.value,
        description: steps.uploadFiles.description.value,
        side: 'top',
        align: 'end',
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
