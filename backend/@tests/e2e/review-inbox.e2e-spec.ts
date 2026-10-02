jest.mock('franc', () => ({
  franc: () => 'und',
}));

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Transaction, TransactionCategorySource } from '../../src/entities/transaction.entity';
import {
  deleteUserByEmail,
  type E2eAccount,
  e2eTestingModule,
  registerAccount,
} from './helpers/e2e-app';

/**
 * The review inbox is a view over existing rows: a transaction enters it when
 * nothing decided its category (or the model did), leaves it once a human
 * approved it, and a suspected duplicate can be kept or confirmed. Another
 * workspace sees an empty inbox.
 */
describe('Review inbox (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const stamp = Date.now();
  const emails = {
    owner: `inbox-owner-${stamp}@example.com`,
    other: `inbox-other-${stamp}@example.com`,
  };
  let owner: E2eAccount;
  let other: E2eAccount;
  let categoryIds: string[];
  let pendingId: string;
  let aiId: string;
  let duplicateId: string;

  const as = (account: E2eAccount, req: request.Test) =>
    req.set('Authorization', `Bearer ${account.token}`).set('x-workspace-id', account.workspaceId);
  const server = () => app.getHttpServer();
  const transactions = () => dataSource.getRepository(Transaction);

  async function bookExpense(merchant: string, date: string): Promise<string> {
    const statement = await as(owner, request(server()).post('/statements/manual-expense'))
      .field('amount', '30')
      .field('currency', 'KZT')
      .field('merchant', merchant)
      .field('categoryId', categoryIds[0])
      .field('date', date)
      .expect(201);
    const listed = await as(
      owner,
      request(server()).get(`/transactions?statementId=${statement.body.id}`),
    ).expect(200);
    return listed.body.data[0].id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await e2eTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    owner = await registerAccount(app, emails.owner, 'Inbox Owner');
    other = await registerAccount(app, emails.other, 'Inbox Other');
    const categories = await as(owner, request(server()).get('/categories?type=expense')).expect(
      200,
    );
    categoryIds = categories.body.map((category: { id: string }) => category.id);

    // Manual entries are born verified; these three were "imported" and left undecided.
    pendingId = await bookExpense('Unknown shop', '2026-06-01');
    await transactions().update(pendingId, {
      isVerified: false,
      categoryId: null,
      categorySource: TransactionCategorySource.DEFAULT,
    });
    aiId = await bookExpense('Model guess', '2026-06-02');
    await transactions().update(aiId, {
      isVerified: false,
      categorySource: TransactionCategorySource.AI,
      categoryReason: 'confidence 0.93',
    });
    duplicateId = await bookExpense('Twice imported', '2026-06-03');
    await transactions().update(duplicateId, {
      isVerified: false,
      isDuplicate: true,
      duplicateOfId: pendingId,
      duplicateConfidence: 0.91,
      duplicateMatchType: 'hybrid',
    });
  });

  afterAll(async () => {
    if (dataSource) {
      for (const email of Object.values(emails)) {
        await deleteUserByEmail(dataSource, email);
      }
    }
    await app.close();
  });

  it('lists what needs a decision, with counts per kind', async () => {
    const res = await as(owner, request(server()).get('/review-inbox')).expect(200);

    expect(res.body.kind).toBe('transaction');
    expect(res.body.counts).toMatchObject({
      transaction: 2,
      duplicate: 1,
      receipt: 0,
      subscription: 0,
      total: 3,
    });
    const ids = res.body.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual([aiId, pendingId]);
    expect(res.body.items[0]).toMatchObject({
      kind: 'transaction',
      categorySource: 'ai',
      categoryReason: 'confidence 0.93',
    });
  });

  it('filters by date for a "vacation mode" selection', async () => {
    const res = await as(
      owner,
      request(server()).get('/review-inbox?from=2026-06-02&to=2026-06-02'),
    ).expect(200);
    expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([aiId]);
    expect(res.body.total).toBe(1);
  });

  it('shows the model picks as approved when the workspace trusts them', async () => {
    await as(owner, request(server()).patch(`/workspaces/${owner.workspaceId}`))
      .send({ processing: { autoApproveAiPicks: true } })
      .expect(200);
    const trusted = await as(owner, request(server()).get('/review-inbox/counts')).expect(200);
    expect(trusted.body.transaction).toBe(1);

    await as(owner, request(server()).patch(`/workspaces/${owner.workspaceId}`))
      .send({ processing: { autoApproveAiPicks: false } })
      .expect(200);
  });

  it('approving with a category records a manual pick and empties the queue', async () => {
    const res = await as(owner, request(server()).post('/review-inbox/transactions/approve'))
      .send({ ids: [pendingId, aiId], categoryId: categoryIds[1] })
      .expect(200);
    expect(res.body).toEqual({ approved: 2 });

    for (const id of [pendingId, aiId]) {
      const row = await transactions().findOneByOrFail({ id });
      expect(row.isVerified).toBe(true);
      expect(row.categoryId).toBe(categoryIds[1]);
      expect(row.categorySource).toBe('manual');
    }
    const counts = await as(owner, request(server()).get('/review-inbox/counts')).expect(200);
    expect(counts.body.transaction).toBe(0);
  });

  it('lists suspected duplicates and lets the user keep one', async () => {
    const list = await as(owner, request(server()).get('/review-inbox?kind=duplicate')).expect(
      200,
    );
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      kind: 'duplicate',
      id: duplicateId,
      duplicateOfId: pendingId,
      matchType: 'hybrid',
    });

    await as(owner, request(server()).post(`/review-inbox/duplicates/${duplicateId}/resolve`))
      .send({ decision: 'keep' })
      .expect(200);
    const row = await transactions().findOneByOrFail({ id: duplicateId });
    expect(row.isDuplicate).toBe(false);
    expect(row.duplicateOfId).toBeNull();

    const counts = await as(owner, request(server()).get('/review-inbox/counts')).expect(200);
    expect(counts.body.duplicate).toBe(0);
  });

  it('confirming a duplicate keeps it flagged but stops asking', async () => {
    await transactions().update(duplicateId, {
      isVerified: false,
      isDuplicate: true,
      duplicateOfId: pendingId,
      duplicateMatchType: 'fuzzy',
    });
    await as(owner, request(server()).post(`/review-inbox/duplicates/${duplicateId}/resolve`))
      .send({ decision: 'confirm' })
      .expect(200);
    const row = await transactions().findOneByOrFail({ id: duplicateId });
    expect(row.isDuplicate).toBe(true);
    expect(row.isVerified).toBe(true);
    const counts = await as(owner, request(server()).get('/review-inbox/counts')).expect(200);
    expect(counts.body.duplicate).toBe(0);
  });

  it('shows another workspace nothing and refuses its actions', async () => {
    const counts = await as(other, request(server()).get('/review-inbox/counts')).expect(200);
    expect(counts.body.total).toBe(0);
    await as(other, request(server()).post(`/review-inbox/duplicates/${duplicateId}/resolve`))
      .send({ decision: 'keep' })
      .expect(404);
    const approve = await as(other, request(server()).post('/review-inbox/transactions/approve'))
      .send({ ids: [pendingId] })
      .expect(200);
    expect(approve.body).toEqual({ approved: 0 });
  });

  it('validates the body', async () => {
    await as(owner, request(server()).post('/review-inbox/transactions/approve'))
      .send({ ids: [] })
      .expect(400);
    await as(owner, request(server()).get('/review-inbox?kind=nope')).expect(400);
  });
});
