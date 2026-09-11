import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import type { PromptMessage } from '@/app/(main)/ai-analysis/chat/build-prompt';
import type { AgentEngine } from './useAgentChat';

/**
 * Adapts the WebLLM engine to the narrow AgentEngine interface.
 *
 * Non-streaming on purpose: a turn is a JSON envelope, and streaming half a
 * JSON object to the screen reads as garbage. The visible latency cost is one
 * reply's worth of tokens, bounded by max_tokens.
 */
export function createWebLlmAgentEngine(engine: MLCEngineInterface): AgentEngine {
  return {
    async complete(messages: PromptMessage[]): Promise<string> {
      const response = await engine.chat.completions.create({
        messages,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });
      return response.choices[0]?.message?.content ?? '';
    },
    interrupt: () => engine.interruptGenerate(),
  };
}
