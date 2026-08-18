import type { PromptMessage } from '@/app/(main)/ai-analysis/chat/build-prompt';
import apiClient from '@/app/lib/api';
import type { AgentEngine } from './useAgentChat';

export interface CloudProviderStatus {
  configured: boolean;
  model: string | null;
}

/** Whether this workspace has a BYO-key cloud model configured (Integrations → AI). */
export async function fetchCloudProviderStatus(): Promise<CloudProviderStatus> {
  const response = await apiClient.get<CloudProviderStatus>('/ai-analysis/completions/status');
  return response.data;
}

/**
 * AgentEngine backed by the workspace's cloud provider. Requests leave the
 * instance — the chat page shows which model serves them, and configuring the
 * provider at all is an explicit admin opt-in.
 */
export function createCloudAgentEngine(): AgentEngine {
  return {
    async complete(messages: PromptMessage[]): Promise<string> {
      const response = await apiClient.post<{ content: string }>('/ai-analysis/completions', {
        messages,
      });
      return response.data.content;
    },
  };
}
