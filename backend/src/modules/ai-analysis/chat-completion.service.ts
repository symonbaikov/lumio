import Anthropic from '@anthropic-ai/sdk';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isAnthropicBaseUrl } from '../../common/utils/ai-provider.util';
import type { AiRuntimeSettings } from '../application-settings/application-settings.service';
import { ApplicationSettingsService } from '../application-settings/application-settings.service';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Tokens billed to the caller's provider, when the provider reports them. */
export interface ChatCompletionUsage {
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: ChatCompletionUsage;
}

const MAX_OUTPUT_TOKENS = 1024;

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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

  async isConfigured(
    workspaceId: string,
    userId?: string | null,
  ): Promise<{ configured: boolean; model: string | null; source: AiRuntimeSettings['source'] }> {
    const runtime = await this.applicationSettingsService.getAiSettingsForChat(workspaceId, userId);
    const configured = runtime.source !== 'disabled' && Boolean(runtime.baseUrl && runtime.model);
    return {
      configured,
      model: configured ? runtime.model : null,
      source: configured ? runtime.source : 'disabled',
    };
  }

  async complete(
    workspaceId: string,
    userId: string | null,
    messages: ChatCompletionMessage[],
  ): Promise<ChatCompletionResult> {
    const runtime = await this.applicationSettingsService.getAiSettingsForChat(workspaceId, userId);

    if (runtime.source === 'disabled' || !(runtime.baseUrl && runtime.model)) {
      throw new ServiceUnavailableException('Cloud AI provider is not configured');
    }

    this.assertSingleLeadingSystemMessage(messages);

    if (isAnthropicBaseUrl(runtime.baseUrl)) {
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

  /**
   * The client assembles the prompt, so the request body decides what carries
   * system authority. Workspace data — merchant names, tool results — is fenced
   * and travels in user turns; allowing a second system turn after it would let
   * that data be re-labelled as an operator instruction. One system message, and
   * only as the opening turn.
   */
  private assertSingleLeadingSystemMessage(messages: ChatCompletionMessage[]): void {
    const systemIndexes = messages
      .map((message, index) => (message.role === 'system' ? index : -1))
      .filter(index => index !== -1);

    if (systemIndexes.length > 1) {
      throw new BadRequestException('Only one system message is allowed');
    }
    if (systemIndexes.length === 1 && systemIndexes[0] !== 0) {
      throw new BadRequestException('The system message must be the first message');
    }
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
      return {
        content: text,
        model: response.model,
        usage: {
          promptTokens: response.usage?.input_tokens ?? null,
          completionTokens: response.usage?.output_tokens ?? null,
        },
      };
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
      return {
        content,
        model,
        usage: {
          promptTokens: payload.usage?.prompt_tokens ?? null,
          completionTokens: payload.usage?.completion_tokens ?? null,
        },
      };
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
