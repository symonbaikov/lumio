import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { chatTools, describeToolsForPrompt, getChatTool, parseIntent } from './registry';

const CATEGORY_ID = '3b2f8f34-6f0f-4b1e-9a52-0d51f4f2a111';
const TRANSACTION_ID = '9d1c7a20-1234-4b1e-9a52-0d51f4f2a222';

describe('chat tool registry', () => {
  it('exposes only read/write/ui kinds with unique names', () => {
    const names = chatTools.map(tool => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of chatTools) {
      expect(['read', 'write', 'ui']).toContain(tool.kind);
    }
  });

  it('write tools are never marked as read', () => {
    expect(getChatTool('create_expense')?.kind).toBe('write');
    expect(getChatTool('set_transaction_category')?.kind).toBe('write');
  });

  it('prompt description mentions every tool', () => {
    const prompt = describeToolsForPrompt();
    for (const tool of chatTools) {
      expect(prompt).toContain(tool.name);
    }
  });
});

describe('parseIntent', () => {
  it('parses a plain reply without action', () => {
    const parsed = parseIntent('{"reply": "Привет!", "action": null}');
    expect(parsed).toEqual({ ok: true, reply: 'Привет!', action: null });
  });

  it('parses a valid write intent and builds a human summary', () => {
    const parsed = parseIntent(
      JSON.stringify({
        reply: 'Записываю расход',
        action: {
          name: 'create_expense',
          params: {
            amount: 5000,
            merchant: 'Такси',
            date: '2026-08-16',
            categoryId: CATEGORY_ID,
            categoryName: 'Транспорт',
          },
        },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.action) {
      expect(parsed.action.tool.name).toBe('create_expense');
      // toLocaleString('ru-RU') separates thousands with a non-breaking space.
      expect(parsed.action.summary.replace(/[  ]/g, ' ')).toContain('5 000');
      expect(parsed.action.summary).toContain('Такси');
    } else {
      throw new Error('expected an action');
    }
  });

  it('strips markdown fences and leading prose', () => {
    const parsed = parseIntent(
      'Вот ответ:\n```json\n{"reply": "ок", "action": {"name": "get_dashboard", "params": {}}}\n```',
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.action) {
      expect(parsed.action.tool.name).toBe('get_dashboard');
    } else {
      throw new Error('expected an action');
    }
  });

  it('rejects unknown action names', () => {
    const parsed = parseIntent('{"reply": "", "action": {"name": "delete_everything", "params": {}}}');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain('delete_everything');
    }
  });

  it('rejects schema violations with the failing path', () => {
    const parsed = parseIntent(
      JSON.stringify({
        reply: '',
        action: {
          name: 'set_transaction_category',
          params: { transactionId: TRANSACTION_ID, categoryId: 'not-a-uuid' },
        },
      }),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain('categoryId');
    }
  });

  it('rejects non-JSON output', () => {
    expect(parseIntent('Просто текст без JSON').ok).toBe(false);
    expect(parseIntent('{"reply": 42, "action": null}').ok).toBe(false);
  });
});
