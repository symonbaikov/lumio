import { z } from 'zod';
import { STATEMENTS_OPEN_UPLOAD_MODAL_EVENT } from '@/app/lib/statement-upload-actions';
import type { ChatTool } from './types';

/**
 * UI tools reuse the app's existing CustomEvent bus (the same one the keyboard
 * shortcuts dispatch on), so chat mode drives the very dialogs the full UI uses.
 */
export const uiTools: ChatTool[] = [
  {
    name: 'open_upload_statement',
    promptLine: 'open_upload_statement {} — открыть окно загрузки банковской выписки',
    kind: 'ui',
    schema: z.object({}),
    summarize: () => 'Открыть загрузку выписки',
    execute: async () => {
      window.dispatchEvent(new CustomEvent(STATEMENTS_OPEN_UPLOAD_MODAL_EVENT));
      return { opened: true };
    },
  },
];
