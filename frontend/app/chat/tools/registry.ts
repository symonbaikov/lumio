import { readTools } from './read-tools';
import type { ChatIntent, ChatTool } from './types';
import { uiTools } from './ui-tools';
import { writeTools } from './write-tools';

export const chatTools: ChatTool[] = [...readTools, ...writeTools, ...uiTools];

const byName = new Map(chatTools.map(tool => [tool.name, tool]));

export function getChatTool(name: string): ChatTool | undefined {
  return byName.get(name);
}

/** The action list block for the system prompt, generated from the registry. */
export function describeToolsForPrompt(): string {
  return chatTools.map(tool => `- ${tool.promptLine}`).join('\n');
}

export type ParsedIntent =
  | { ok: true; reply: string; action: null }
  | { ok: true; reply: string; action: { tool: ChatTool; params: unknown; summary: string } }
  | { ok: false; error: string };

/**
 * Parses one model turn into a validated intent.
 *
 * Tolerates markdown fences and leading prose before the JSON object — small
 * models add both — but is strict about everything the executor relies on:
 * unknown action names and schema violations are errors, not best guesses.
 */
export function parseIntent(rawText: string): ParsedIntent {
  // Reasoning models (Qwen 3.5) may prepend a <think> block; its free-form
  // text can contain braces, so it must go before the JSON is located.
  let raw = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    raw = fence[1].trim();
  }
  const start = raw.indexOf('{');
  if (start < 0) {
    return { ok: false, error: 'The reply contains no JSON object' };
  }
  raw = raw.slice(start);

  let parsed: ChatIntent;
  try {
    parsed = JSON.parse(raw) as ChatIntent;
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  if (typeof parsed.reply !== 'string') {
    return { ok: false, error: 'Field "reply" is missing or is not a string' };
  }

  if (parsed.action === null || parsed.action === undefined) {
    return { ok: true, reply: parsed.reply, action: null };
  }

  if (typeof parsed.action.name !== 'string') {
    return { ok: false, error: 'Field "action.name" is missing or is not a string' };
  }

  const tool = getChatTool(parsed.action.name);
  if (!tool) {
    return { ok: false, error: `Unknown action "${parsed.action.name}"` };
  }

  const validation = tool.schema.safeParse(parsed.action.params ?? {});
  if (!validation.success) {
    const issues = validation.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { ok: false, error: `Invalid parameters for "${tool.name}": ${issues}` };
  }

  return {
    ok: true,
    reply: parsed.reply,
    action: {
      tool,
      params: validation.data,
      summary: tool.summarize(validation.data),
    },
  };
}
