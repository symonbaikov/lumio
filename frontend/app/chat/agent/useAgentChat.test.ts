import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/app/(main)/ai-analysis/chat/chats-api', () => ({
  createChat: vi.fn(async () => ({ id: 'chat-1' })),
  appendMessage: vi.fn(async () => undefined),
}));

import apiClient from '@/app/lib/api';
import * as chatsApi from '@/app/(main)/ai-analysis/chat/chats-api';
import type { AgentEngine } from './useAgentChat';
import { useAgentChat } from './useAgentChat';

const CATEGORY_ID = '3b2f8f34-6f0f-4b1e-9a52-0d51f4f2a111';

function scriptedEngine(outputs: string[]): AgentEngine & { calls: number } {
  const engine = {
    calls: 0,
    async complete() {
      const output = outputs[Math.min(engine.calls, outputs.length - 1)];
      engine.calls += 1;
      return output;
    },
  };
  return engine;
}

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chatsApi.createChat as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'chat-1' });
    (chatsApi.appendMessage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders a plain reply when no action is requested', async () => {
    const engine = scriptedEngine(['{"reply": "Привет! Чем помочь?", "action": null}']);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Привет'));

    expect(result.current.turns.map(turn => turn.role)).toEqual(['user', 'assistant']);
    expect(result.current.turns[1].content).toBe('Привет! Чем помочь?');
    expect(engine.calls).toBe(1);
  });

  it('executes read tools automatically and feeds the result back', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { snapshot: { totalBalance: 1000 } },
    });
    const engine = scriptedEngine([
      '{"reply": "Смотрю сводку", "action": {"name": "get_dashboard", "params": {}}}',
      '{"reply": "Ваш баланс 1000 KZT", "action": null}',
    ]);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Сколько у меня денег?'));

    expect(engine.calls).toBe(2);
    const toolTurn = result.current.turns.find(turn => turn.role === 'tool');
    expect(toolTurn?.action?.status).toBe('done');
    expect(result.current.turns.at(-1)?.content).toBe('Ваш баланс 1000 KZT');
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard');
  });

  it('never executes a write tool without confirmation', async () => {
    const engine = scriptedEngine([
      JSON.stringify({
        reply: 'Записать расход?',
        action: {
          name: 'create_expense',
          params: { amount: 5000, merchant: 'Такси', date: '2026-08-16', categoryId: CATEGORY_ID },
        },
      }),
    ]);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Добавь расход 5000 на такси вчера'));

    const card = result.current.turns.find(turn => turn.role === 'tool');
    expect(card?.action?.status).toBe('pending');
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/statements/manual-expense',
      expect.anything(),
      expect.anything(),
    );
  });

  it('executes the pending write on confirm with an idempotency key', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'stmt-1' } });
    const engine = scriptedEngine([
      JSON.stringify({
        reply: 'Записать расход?',
        action: {
          name: 'create_expense',
          params: { amount: 5000, merchant: 'Такси', date: '2026-08-16', categoryId: CATEGORY_ID },
        },
      }),
    ]);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Добавь расход 5000 на такси вчера'));
    const card = result.current.turns.find(turn => turn.role === 'tool');
    expect(card).toBeDefined();

    await act(() => result.current.confirmAction(card?.id ?? ''));

    await waitFor(() => {
      expect(result.current.turns.find(turn => turn.role === 'tool')?.action?.status).toBe('done');
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/statements/manual-expense',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ 'idempotency-key': expect.any(String) }),
      }),
    );
  });

  it('cancelling a pending write leaves the backend untouched', async () => {
    const engine = scriptedEngine([
      JSON.stringify({
        reply: 'Записать расход?',
        action: {
          name: 'create_expense',
          params: { amount: 5000, merchant: 'Такси', date: '2026-08-16', categoryId: CATEGORY_ID },
        },
      }),
    ]);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Добавь расход 5000 на такси'));
    const card = result.current.turns.find(turn => turn.role === 'tool');

    act(() => result.current.cancelAction(card?.id ?? ''));

    expect(result.current.turns.find(turn => turn.role === 'tool')?.action?.status).toBe(
      'cancelled',
    );
    await act(() => result.current.confirmAction(card?.id ?? ''));
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/statements/manual-expense',
      expect.anything(),
      expect.anything(),
    );
  });

  it('retries once on malformed output, then degrades to plain text', async () => {
    const engine = scriptedEngine(['это не JSON', 'всё ещё не JSON']);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Привет'));

    expect(engine.calls).toBe(2);
    expect(result.current.turns.at(-1)?.role).toBe('assistant');
    expect(result.current.turns.at(-1)?.content).toBe('всё ещё не JSON');
  });

  it('persists user, assistant and tool turns', async () => {
    const engine = scriptedEngine(['{"reply": "Готово", "action": null}']);
    const { result } = renderHook(() => useAgentChat(engine, 'model-1'));

    await act(() => result.current.send('Привет'));

    expect(chatsApi.createChat).toHaveBeenCalledWith('model-1', 'Привет');
    expect(chatsApi.appendMessage).toHaveBeenCalledWith('chat-1', 'user', 'Привет', undefined);
    expect(chatsApi.appendMessage).toHaveBeenCalledWith('chat-1', 'assistant', 'Готово', undefined);
  });
});
