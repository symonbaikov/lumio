import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApplicationSettingsService } from '../application-settings/application-settings.service';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
}

const MAX_OUTPUT_TOKENS = 1024;
const ANTHROPIC_HOST = 'api.anthropic.com';

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/**
 * Cloud completions for chat mode, backed by the workspace's existing
 * BYO-key AI settings (Integrations → AI-compatible provider).
 *
 * Anthropic gets the official SDK; every other base URL is treated as an
 * OpenAI-compatible /v1/chat/completions endpoint — the same contract the
 * rest of the backend (BaseAiHelper) already assumes.
 */
@Injectable()
export class ChatCompletionService {
  private readonly logger = new Logger(ChatCompletionService.name);

  constructor(private readonly applicationSettingsService: ApplicationSettingsService) {}

  async isConfigured(workspaceId: string): Promise<{ configured: boolean; model: string | null }> {
    const runtime = await this.applicationSettingsService.getAiSettingsForWorkspaceId(workspaceId);
    const configured = runtime.source !== 'disabled' && Boolean(runtime.baseUrl && runtime.model);
    return { configured, model: configured ? runtime.model : null };
  }

  async complete(
    workspaceId: string,
    messages: ChatCompletionMessage[],
  ): Promise<ChatCompletionResult> {
    const runtime = await this.applicationSettingsService.getAiSettingsForWorkspaceId(workspaceId);

    if (runtime.source === 'disabled' || !(runtime.baseUrl && runtime.model)) {
      throw new ServiceUnavailableException('Cloud AI provider is not configured');
    }

    const isAnthropic = runtime.baseUrl.includes(ANTHROPIC_HOST);
    if (isAnthropic) {
      return this.completeViaAnthropic(runtime.apiKey, runtime.model, messages);
    }
    return this.completeViaOpenAiCompatible(
      runtime.baseUrl,
      runtime.apiKey,
      runtime.model,
      runtime.timeoutMs,
      messages,
    );
  }

  private async completeViaAnthropic(
    apiKey: string | null,
    model: string,
    messages: ChatCompletionMessage[],
  ): Promise<ChatCompletionResult> {
    const client = new Anthropic({ apiKey: apiKey ?? undefined });
    const system = messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n');
    const turns = messages
      .filter((message): message is ChatCompletionMessage & { role: 'user' | 'assistant' } =>
        ['user', 'assistant'].includes(message.role),
      )
      .map(message => ({ role: message.role, content: message.content }));

    try {
      const response = await client.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(system ? { system } : {}),
        messages: turns,
      });

      if (response.stop_reason === 'refusal') {
        throw new ServiceUnavailableException('The model declined this request');
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');
      return { content: text, model: response.model };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.warn({ type: 'chat_completion_anthropic_failed' });
      throw new ServiceUnavailableException('Cloud AI request failed');
    }
  }

  private async completeViaOpenAiCompatible(
    baseUrl: string,
    apiKey: string | null,
    model: string,
    timeoutMs: number,
    messages: ChatCompletionMessage[],
  ): Promise<ChatCompletionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, messages, temperature: 0.2 }),
      });

      if (!response.ok) {
        this.logger.warn({ type: 'chat_completion_upstream_error', status: response.status });
        throw new ServiceUnavailableException('Cloud AI request failed');
      }

      const payload = (await response.json()) as OpenAiChatResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new ServiceUnavailableException('Cloud AI returned an empty response');
      }
      return { content, model };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.warn({ type: 'chat_completion_request_failed' });
      throw new ServiceUnavailableException('Cloud AI request failed');
    } finally {
      clearTimeout(timer);
    }
  }
}
