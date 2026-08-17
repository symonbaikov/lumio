import { ChatCompletionService } from '@/modules/ai-analysis/chat-completion.service';
import { ServiceUnavailableException } from '@nestjs/common';

const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }));
});

describe('ChatCompletionService', () => {
  const runtime = {
    enabled: true,
    baseUrl: 'https://llm.example.com',
    apiKey: 'sk-test',
    model: 'test-model',
    timeoutMs: 20000,
    source: 'workspace' as const,
  };
  const settings = { getAiSettingsForWorkspaceId: jest.fn() };
  const service = new ChatCompletionService(settings as never);
  const messages = [
    { role: 'system' as const, content: 'You are a bot' },
    { role: 'user' as const, content: 'Привет' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    settings.getAiSettingsForWorkspaceId.mockResolvedValue(runtime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports configured status from workspace settings', async () => {
    await expect(service.isConfigured('ws-1')).resolves.toEqual({
      configured: true,
      model: 'test-model',
    });

    settings.getAiSettingsForWorkspaceId.mockResolvedValue({ ...runtime, source: 'disabled' });
    await expect(service.isConfigured('ws-1')).resolves.toEqual({ configured: false, model: null });
  });

  it('rejects when no provider is configured', async () => {
    settings.getAiSettingsForWorkspaceId.mockResolvedValue({ ...runtime, source: 'disabled' });
    await expect(service.complete('ws-1', messages)).rejects.toThrow(ServiceUnavailableException);
  });

  it('calls an OpenAI-compatible endpoint with bearer auth', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"reply":"ок","action":null}' } }] }),
    } as never);

    const result = await service.complete('ws-1', messages);

    expect(result).toEqual({ content: '{"reply":"ок","action":null}', model: 'test-model' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://llm.example.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
  });

  it('maps upstream failures to 503', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue({ ok: false, status: 500 } as never);
    await expect(service.complete('ws-1', messages)).rejects.toThrow(ServiceUnavailableException);
  });

  it('routes api.anthropic.com through the official SDK with a system field', async () => {
    settings.getAiSettingsForWorkspaceId.mockResolvedValue({
      ...runtime,
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-opus-5',
    });
    mockAnthropicCreate.mockResolvedValue({
      model: 'claude-opus-5',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '{"reply":"ок","action":null}' }],
    });

    const result = await service.complete('ws-1', messages);

    expect(result.content).toBe('{"reply":"ок","action":null}');
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        system: 'You are a bot',
        messages: [{ role: 'user', content: 'Привет' }],
      }),
    );
  });

  it('surfaces anthropic refusals as 503', async () => {
    settings.getAiSettingsForWorkspaceId.mockResolvedValue({
      ...runtime,
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-opus-5',
    });
    mockAnthropicCreate.mockResolvedValue({
      model: 'claude-opus-5',
      stop_reason: 'refusal',
      content: [],
    });

    await expect(service.complete('ws-1', messages)).rejects.toThrow(ServiceUnavailableException);
  });
});
