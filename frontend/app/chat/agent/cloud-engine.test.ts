import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/app/lib/api';
import { createCloudAgentEngine, fetchCloudProviderStatus } from './cloud-engine';

describe('cloud engine', () => {
  it('fetches provider status', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { configured: true, model: 'claude-opus-5' },
    });

    await expect(fetchCloudProviderStatus()).resolves.toEqual({
      configured: true,
      model: 'claude-opus-5',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/ai-analysis/completions/status');
  });

  it('completes via the backend proxy', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { content: '{"reply":"ок","action":null}' },
    });

    const engine = createCloudAgentEngine();
    const messages = [{ role: 'user' as const, content: 'Привет' }];

    await expect(engine.complete(messages)).resolves.toBe('{"reply":"ок","action":null}');
    expect(apiClient.post).toHaveBeenCalledWith('/ai-analysis/completions', { messages });
  });
});
