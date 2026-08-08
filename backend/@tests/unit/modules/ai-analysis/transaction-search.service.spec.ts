import {
  TransactionSearchService,
  dot,
} from '../../../../src/modules/ai-analysis/transaction-search.service';
import { EMBEDDING_MODEL_ID } from '../../../../src/modules/ai-analysis/text-embedding.service';

const WORKSPACE = 'ws-1';

function unit(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return values.map(value => value / norm);
}

const PHARMACY = unit([1, 0, 0]);
const TAXI = unit([0, 1, 0]);
const GROCERY = unit([0.7, 0.1, 0.7]);

function createService(options: { rows?: unknown[]; pending?: number } = {}) {
  const embeddings = {
    find: jest.fn().mockResolvedValue(options.rows ?? []),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
  };

  const pendingBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(options.pending ?? 0),
  };

  const transactions = {
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => pendingBuilder),
  };

  const embedder = { embed: jest.fn() };

  const service = new TransactionSearchService(
    embeddings as never,
    transactions as never,
    embedder as never,
  );

  return { service, embeddings, transactions, embedder, pendingBuilder };
}

describe('dot', () => {
  it('scores identical unit vectors as 1', () => {
    expect(dot(PHARMACY, PHARMACY)).toBeCloseTo(1);
  });

  it('scores orthogonal vectors as 0', () => {
    expect(dot(PHARMACY, TAXI)).toBeCloseTo(0);
  });

  it('returns 0 for mismatched lengths instead of a partial score', () => {
    expect(dot([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe('TransactionSearchService.search', () => {
  it('ranks by similarity to the query', async () => {
    const { service, embeddings, transactions, embedder } = createService();
    embeddings.find.mockResolvedValue([
      { transactionId: 'taxi', vector: TAXI },
      { transactionId: 'pharmacy', vector: PHARMACY },
      { transactionId: 'grocery', vector: GROCERY },
    ]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);
    transactions.find.mockResolvedValue([
      { id: 'pharmacy', counterpartyName: 'Аптека', paymentPurpose: 'p', currency: 'KZT' },
      { id: 'grocery', counterpartyName: 'Магазин', paymentPurpose: 'p', currency: 'KZT' },
      { id: 'taxi', counterpartyName: 'Такси', paymentPurpose: 'p', currency: 'KZT' },
    ]);

    const result = await service.search(WORKSPACE, 'аптека', 3);

    expect(result.hits.map(hit => hit.transactionId)).toEqual(['pharmacy', 'grocery', 'taxi']);
  });

  it('scopes the vector scan to the workspace and the current model', async () => {
    const { service, embeddings, embedder } = createService();
    embeddings.find.mockResolvedValue([{ transactionId: 'a', vector: PHARMACY }]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);

    await service.search(WORKSPACE, 'q');

    expect(embeddings.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: WORKSPACE, modelId: EMBEDDING_MODEL_ID },
      }),
    );
  });

  it('hydrates hits with the workspace filter, never by id alone', async () => {
    const { service, embeddings, transactions, embedder } = createService();
    embeddings.find.mockResolvedValue([{ transactionId: 'a', vector: PHARMACY }]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);

    await service.search(WORKSPACE, 'q');

    expect(transactions.find).toHaveBeenCalledWith({
      where: [{ id: 'a', workspaceId: WORKSPACE }],
    });
  });

  it('drops a hit whose transaction is not in this workspace', async () => {
    const { service, embeddings, transactions, embedder } = createService();
    embeddings.find.mockResolvedValue([{ transactionId: 'foreign', vector: PHARMACY }]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);
    // The workspace-scoped hydrate returns nothing for it.
    transactions.find.mockResolvedValue([]);

    const result = await service.search(WORKSPACE, 'q');

    expect(result.hits).toEqual([]);
  });

  it('respects the requested limit', async () => {
    const { service, embeddings, transactions, embedder } = createService();
    embeddings.find.mockResolvedValue([
      { transactionId: 'a', vector: PHARMACY },
      { transactionId: 'b', vector: GROCERY },
      { transactionId: 'c', vector: TAXI },
    ]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);
    transactions.find.mockResolvedValue([
      { id: 'a', counterpartyName: 'A', paymentPurpose: '', currency: 'KZT' },
      { id: 'b', counterpartyName: 'B', paymentPurpose: '', currency: 'KZT' },
    ]);

    const result = await service.search(WORKSPACE, 'q', 2);

    expect(result.hits).toHaveLength(2);
  });

  it('does not embed the query when nothing is indexed yet', async () => {
    const { service, embedder } = createService({ rows: [] });

    const result = await service.search(WORKSPACE, 'q');

    expect(result.hits).toEqual([]);
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('reports how many transactions still lack a vector', async () => {
    const { service } = createService({ pending: 42 });

    const result = await service.search(WORKSPACE, 'q');

    expect(result.pendingEmbeddings).toBe(42);
  });

  it('reports truncation rather than silently scoring a subset', async () => {
    const rows = Array.from({ length: 20001 }, (_unused, index) => ({
      transactionId: `t-${index}`,
      vector: PHARMACY,
    }));
    const { service, embedder, transactions } = createService({ rows });
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);
    transactions.find.mockResolvedValue([]);

    const result = await service.search(WORKSPACE, 'q');

    expect(result.truncated).toBe(true);
  });
});

describe('TransactionSearchService.backfill', () => {
  it('does nothing and asks for no vectors when everything is indexed', async () => {
    const { service, embedder, embeddings } = createService();

    const result = await service.backfill(WORKSPACE);

    expect(result).toEqual({ embedded: 0, remaining: 0 });
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(embeddings.save).not.toHaveBeenCalled();
  });

  it('indexes counterparty and purpose together', async () => {
    const { service, embedder, pendingBuilder } = createService();
    pendingBuilder.getMany.mockResolvedValue([
      { id: 't1', counterpartyName: 'Аптека Европа', paymentPurpose: 'Покупка лекарств' },
    ]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);

    await service.backfill(WORKSPACE);

    expect(embedder.embed).toHaveBeenCalledWith(['Аптека Европа — Покупка лекарств']);
  });

  it('stamps stored vectors with workspace and model', async () => {
    const { service, embedder, embeddings, pendingBuilder } = createService();
    pendingBuilder.getMany.mockResolvedValue([
      { id: 't1', counterpartyName: 'A', paymentPurpose: 'B' },
    ]);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);

    await service.backfill(WORKSPACE);

    expect(embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 't1',
        workspaceId: WORKSPACE,
        modelId: EMBEDDING_MODEL_ID,
      }),
    );
  });

  it('reports what is left so the caller controls how long to run', async () => {
    const { service, embedder, pendingBuilder } = createService();
    pendingBuilder.getMany.mockResolvedValue([
      { id: 't1', counterpartyName: 'A', paymentPurpose: 'B' },
    ]);
    pendingBuilder.getCount.mockResolvedValue(17);
    embedder.embed.mockResolvedValue([Float32Array.from(PHARMACY)]);

    const result = await service.backfill(WORKSPACE);

    expect(result).toEqual({ embedded: 1, remaining: 17 });
  });
});
