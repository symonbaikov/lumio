import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/app/lib/api', () => ({ default: { post } }));

const KEY = 'lumio-statement-stage';

type Body = { statementIds: string[]; stage: string };

/** The server's answer for a stage move, decided per id by `refuse`. */
function serverAnswers(refuse: (id: string, stage: string) => string | null): void {
  post.mockImplementation(async (_url: string, body: Body) => {
    const updated: string[] = [];
    const skipped: Array<{ id: string; code: string }> = [];
    for (const id of body.statementIds) {
      const code = refuse(id, body.stage);
      if (code) skipped.push({ id, code });
      else updated.push(id);
    }
    return { data: { updated, skipped } };
  });
}

// The migration memoises itself per page load, so each test needs a fresh module.
async function migrate(): Promise<void> {
  vi.resetModules();
  const { migrateLocalStatementStages } = await import('../statement-workflow');
  await migrateLocalStatementStages();
}

describe('migrateLocalStatementStages', () => {
  beforeEach(() => {
    post.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does nothing and calls no API when there is no local copy', async () => {
    await migrate();
    expect(post).not.toHaveBeenCalled();
  });

  it('replays approve first, then pay, and clears the local copy', async () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 'approve', p: 'pay', s: 'submit' }));
    serverAnswers(() => null);

    await migrate();

    expect(post.mock.calls.map(([, body]) => body)).toEqual([
      { statementIds: ['a', 'p'], stage: 'approve' },
      { statementIds: ['p'], stage: 'pay' },
    ]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does not try pay for a statement the server kept in submit', async () => {
    localStorage.setItem(KEY, JSON.stringify({ p: 'pay' }));
    serverAnswers(() => 'UNCATEGORIZED_TRANSACTIONS');

    await migrate();

    expect(post).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('drops refused entries too, so they are not re-sent on every load', async () => {
    localStorage.setItem(KEY, JSON.stringify({ mine: 'approve', gone: 'pay' }));
    serverAnswers(id => (id === 'gone' ? 'STATEMENT_NOT_FOUND' : null));

    await migrate();

    expect(post).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the local copy when the server cannot be reached', async () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 'approve' }));
    post.mockRejectedValue(new Error('Network Error'));

    await migrate();

    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ a: 'approve' });
  });

  it('runs once however many callers ask', async () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 'approve' }));
    serverAnswers(() => null);
    vi.resetModules();
    const { migrateLocalStatementStages } = await import('../statement-workflow');

    await Promise.all([migrateLocalStatementStages(), migrateLocalStatementStages()]);

    expect(post).toHaveBeenCalledTimes(1);
  });
});
