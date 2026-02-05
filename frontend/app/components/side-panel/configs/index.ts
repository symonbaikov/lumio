'use client';

import type { SidePanelPageConfig } from '../types';

export function createBasicSidePanelConfig(options: {
  pageId: string;
  title: string;
  subtitle?: string;
}): SidePanelPageConfig {
  return {
    pageId: options.pageId,
    header: {
      title: options.title,
      subtitle: options.subtitle,
    },
    sections: [],
  };
}

// ============================================================================
// Statements Page Configuration
// ============================================================================
