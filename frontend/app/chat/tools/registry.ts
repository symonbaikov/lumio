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
  let raw = rawText.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    raw = fence[1].trim();
  }
  const start = raw.indexOf('{');
  if (start < 0) {
    return { ok: false, error: 'Ответ не содержит JSON-объекта' };
  }
  raw = raw.slice(start);

  let parsed: ChatIntent;
  try {
    parsed = JSON.parse(raw) as ChatIntent;
  } catch {
    return { ok: false, error: 'Невалидный JSON' };
  }

  if (typeof parsed.reply !== 'string') {
    return { ok: false, error: 'Поле reply отсутствует или не строка' };
  }

  if (parsed.action === null || parsed.action === undefined) {
    return { ok: true, reply: parsed.reply, action: null };
  }

  if (typeof parsed.action.name !== 'string') {
    return { ok: false, error: 'Поле action.name отсутствует или не строка' };
  }

  const tool = getChatTool(parsed.action.name);
  if (!tool) {
    return { ok: false, error: `Неизвестное действие «${parsed.action.name}»` };
  }

  const validation = tool.schema.safeParse(parsed.action.params ?? {});
  if (!validation.success) {
    const issues = validation.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { ok: false, error: `Параметры «${tool.name}» невалидны: ${issues}` };
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
