import type { z } from 'zod';

/**
 * How a tool is allowed to run in chat mode.
 *
 * - `read` — executed automatically as soon as the model asks for it.
 * - `write` — NEVER executed automatically. The UI renders a confirmation card
 *   and calls `execute` only after an explicit user tap. This is the prompt
 *   injection mitigation that replaces the old "no tools, no side effects"
 *   invariant of the analysis chat.
 * - `ui` — dispatches an in-app UI action (open a dialog, navigate); no data
 *   is written by the tool itself.
 */
export type ChatToolKind = 'read' | 'write' | 'ui';

export interface ChatTool<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  /** One line for the system prompt, in Russian, params described inline. */
  promptLine: string;
  kind: ChatToolKind;
  schema: Schema;
  execute: (params: z.infer<Schema>) => Promise<unknown>;
  /** Human-readable summary of the parsed params for the confirmation card. */
  summarize: (params: z.infer<Schema>) => string;
}

/** The single structured turn format the model must produce. */
export interface ChatIntent {
  reply: string;
  action: { name: string; params: Record<string, unknown> } | null;
}
