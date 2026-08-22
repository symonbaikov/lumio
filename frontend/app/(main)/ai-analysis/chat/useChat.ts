'use client';

import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { useCallback, useRef, useState } from 'react';
import { type ContextPacket, buildContextPacket } from '../context/build-context';
import { type SearchHit, fetchContextInput, searchTransactions } from '../context/fetch-context';
import { contextBudgetTokens } from '../context/token-budget';
import { type ChatMessage, buildPrompt } from './build-prompt';
import * as chatsApi from './chats-api';

export interface ChatTurn extends ChatMessage {
  id: string;
  /** True while tokens are still arriving for this reply. */
  streaming?: boolean;
}

export type ChatError = 'context' | 'generation' | null;

let turnCounter = 0;
function nextId(): string {
  turnCounter += 1;
  return `turn-${turnCounter}`;
}

export function useChat(
  engine: MLCEngineInterface | null,
  modelContextTokens: number,
  modelId: string,
) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ChatError>(null);
  const [packet, setPacket] = useState<ContextPacket | null>(null);
  /**
   * Rows the last answer was allowed to see. Shown under the reply so a figure
   * can be traced back to a real transaction instead of being taken on trust.
   */
  const [sources, setSources] = useState<SearchHit[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  /**
   * Saving is best-effort. A conversation that generated fine but failed to
   * persist must stay on screen — losing the answer would be a worse outcome
   * than losing the history entry, and the user can still read and copy it.
   */
  const [unsaved, setUnsaved] = useState(false);
  const abortRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current = true;
    engine?.interruptGenerate();
  }, [engine]);

  const persist = useCallback(
    async (question: string, reply: string): Promise<void> => {
      try {
        let targetId = chatId;
        if (targetId === null) {
          const created = await chatsApi.createChat(modelId, question);
          targetId = created.id;
          setChatId(created.id);
        }

        await chatsApi.appendMessage(targetId, 'user', question);
        if (reply !== '') {
          await chatsApi.appendMessage(targetId, 'assistant', reply);
        }
        setUnsaved(false);
      } catch {
        setUnsaved(true);
      }
    },
    [chatId, modelId],
  );

  const send = useCallback(
    async (question: string): Promise<void> => {
      if (!engine || busy || question.trim() === '') {
        return;
      }

      abortRef.current = false;
      setBusy(true);
      setError(null);

      const history = turns.map(turn => ({ role: turn.role, content: turn.content }));
      const userTurn: ChatTurn = { id: nextId(), role: 'user', content: question };
      const replyId = nextId();
      setTurns(previous => [
        ...previous,
        userTurn,
        { id: replyId, role: 'assistant', content: '', streaming: true },
      ]);

      try {
        // Rebuilt per question: statements may have been imported mid-conversation,
        // and a stale packet would have the model quoting figures that changed.
        const [input, search] = await Promise.all([
          fetchContextInput(),
          // Retrieval is an enhancement, not a requirement: with no vectors built
          // yet the aggregates alone still answer most questions.
          searchTransactions(question).catch(() => null),
        ]);

        const hits = search?.hits ?? [];
        setSources(hits);

        const built = buildContextPacket(
          { ...input, retrieved: hits },
          contextBudgetTokens(modelContextTokens),
        );
        setPacket(built);

        const prompt = buildPrompt(built, history, question);

        const stream = await engine.chat.completions.create({
          messages: prompt.messages,
          stream: true,
          temperature: 0.2,
        });

        let reply = '';
        for await (const chunk of stream) {
          if (abortRef.current) {
            break;
          }
          reply += chunk.choices[0]?.delta?.content ?? '';
          setTurns(previous =>
            previous.map(turn => (turn.id === replyId ? { ...turn, content: reply } : turn)),
          );
        }

        setTurns(previous =>
          previous.map(turn => (turn.id === replyId ? { ...turn, streaming: false } : turn)),
        );

        // Persisted after generation, not before: a question that never produced
        // an answer would otherwise leave a one-sided chat in the history list.
        // A stopped reply is still saved — it is on screen, so storage should agree.
        await persist(question, reply);
      } catch (cause) {
        // A failure to load figures is worth distinguishing: the model is fine,
        // the data is not, and retrying is likely to work.
        setError(cause instanceof Error && cause.name === 'AxiosError' ? 'context' : 'generation');
        setTurns(previous => previous.filter(turn => turn.id !== replyId));
      } finally {
        setBusy(false);
      }
    },
    [engine, busy, turns, modelContextTokens, persist],
  );

  /** Starts a fresh conversation without touching what is already stored. */
  const startNew = useCallback(() => {
    setTurns([]);
    setError(null);
    setPacket(null);
    setSources([]);
    setChatId(null);
    setUnsaved(false);
  }, []);

  const open = useCallback(async (id: string): Promise<void> => {
    const transcript = await chatsApi.getChat(id);

    setChatId(transcript.id);
    setError(null);
    setPacket(null);
    setSources([]);
    setUnsaved(false);
    setTurns(
      transcript.messages.map(message => ({
        id: message.id,
        role: message.role as ChatTurn['role'],
        content: message.content,
      })),
    );
  }, []);

  return { turns, busy, error, packet, sources, chatId, unsaved, send, stop, startNew, open };
}
