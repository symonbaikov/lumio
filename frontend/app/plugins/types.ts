import type React from 'react';

export type PluginKey = 'ai-assistant' | 'webhooks' | 'mcp-server';

export interface PluginMeta {
  key: PluginKey;
  name: React.ReactNode;
  description: React.ReactNode;
  icon: React.ReactNode;
}
