import { Logger } from '@nestjs/common';
import {
  isAiCircuitOpen,
  isAiEnabled,
  recordAiFailure,
  recordAiSuccess,
  withAiConcurrency,
} from '../../modules/parsing/helpers/ai-runtime.util';
import { TimeoutError, retry, withTimeout } from '../utils/async.util';

type GenerateJsonOptions = {
  timeoutMs: number;
  timeoutMessage: string;
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

type AiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type AiTextPart = {
  text: string;
};

type AiContent = {
  role: 'user' | 'model';
  parts: Array<AiInlineDataPart | AiTextPart>;
};

type OpenAiMessageContent =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

type OpenAiChatMessage = {
  role: 'user' | 'assistant';
  content: OpenAiMessageContent;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type BaseAiClientConfig = {
  baseUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
};

export abstract class BaseAiHelper {
  protected readonly logger = new Logger(this.constructor.name);
  protected aiBaseUrl: string | null = null;
  protected aiApiKey: string | null = null;
  protected aiModel: string | null = null;

  constructor(apiKey: string | undefined = process.env.AI_API_KEY) {
    const baseUrl = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;

    if (baseUrl && model && isAiEnabled()) {
      this.aiBaseUrl = baseUrl.replace(/\/+$/, '');
      this.aiApiKey = apiKey || null;
      this.aiModel = model;
    }
  }

  configureAiClient(config: BaseAiClientConfig): void {
    if (config.baseUrl && config.model && isAiEnabled()) {
      this.aiBaseUrl = config.baseUrl.replace(/\/+$/, '');
      this.aiApiKey = config.apiKey || null;
      this.aiModel = config.model;
      return;
    }

    this.aiBaseUrl = null;
    this.aiApiKey = null;
    this.aiModel = null;
  }

  isAvailable(): boolean {
    return Boolean(this.aiBaseUrl && this.aiModel) && isAiEnabled() && !isAiCircuitOpen();
  }

  protected async generateJsonContent(
    contents: AiContent[],
    options: GenerateJsonOptions,
  ): Promise<string | null> {
    if (!(this.aiBaseUrl && this.aiModel && this.isAvailable())) {
      return null;
    }

    try {
      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              fetch(`${this.aiBaseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(this.aiApiKey ? { Authorization: `Bearer ${this.aiApiKey}` } : {}),
                },
                body: JSON.stringify({
                  model: this.aiModel,
                  messages: this.toOpenAiMessages(contents),
                  temperature: 0,
                  response_format: { type: 'json_object' },
                }),
              }),
            ),
            options.timeoutMs,
            options.timeoutMessage,
          ),
        {
          retries: options.retries,
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      if (!completion.ok) {
        recordAiFailure();
        return null;
      }

      const response = (await completion.json()) as OpenAiChatResponse;
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        recordAiFailure();
        return null;
      }

      recordAiSuccess();
      return content;
    } catch {
      recordAiFailure();
      return null;
    }
  }

  private toOpenAiMessages(contents: AiContent[]): OpenAiChatMessage[] {
    return contents.map(content => ({
      role: content.role === 'model' ? 'assistant' : 'user',
      content: this.toOpenAiContent(content.parts),
    }));
  }

  private toOpenAiContent(parts: Array<AiInlineDataPart | AiTextPart>): OpenAiMessageContent {
    const openAiParts = parts.map(part => {
      if ('text' in part) {
        return { type: 'text' as const, text: part.text };
      }

      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      };
    });

    if (openAiParts.every(part => part.type === 'text')) {
      return openAiParts.map(part => ('text' in part ? part.text : '')).join('\n');
    }

    return openAiParts;
  }
}
