import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';

@Injectable()
export class OpenRouterService {
  private readonly client: OpenRouter | null = null;
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');

    if (apiKey) {
      this.client = new OpenRouter({
        apiKey: apiKey,
      });
    } else {
      this.logger.warn('OPENROUTER_API_KEY is not defined. OpenRouter service will not function.');
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async chat(messages: any[], model = 'openai/gpt-3.5-turbo') {
    if (!this.client) {
      throw new Error('OpenRouter client is not initialized (missing API key)');
    }

    try {
      // Cast to `any` to avoid the TypeScript error while preserving runtime behavior
      const completion = await (this.client.chat as any).completions.create({
        model,
        messages,
      } as any);
      return completion;
    } catch (error) {
      this.logger.error('Failed to call OpenRouter API', error);
      throw error;
    }
  }
}
