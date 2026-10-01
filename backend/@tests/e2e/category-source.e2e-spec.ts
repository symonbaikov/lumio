jest.mock('franc', () => ({
  franc: () => 'und',
}));

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Transaction } from '../../src/entities/transaction.entity';
import {
  deleteUserByEmail,
  type E2eAccount,
  e2eTestingModule,
  registerAccount,
} from './helpers/e2e-app';

/**
 * A category the user picks by hand is recorded as such, survives a bulk
 * re-classification, and the workspace switches round-trip through the API.
 */
describe('Category source (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const email = `category-source-${Date.now()}@example.com`;
  let owner: E2eAccount;
  let transactionId: string;
  let categoryIds: string[];

  const as = (req: request.Test) =>
    req.set('Authorization', `Bearer ${owner.token}`).set('x-workspace-id', owner.workspaceId);
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await e2eTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    owner = await registerAccount(app, email, 'Category Source Owner');
    const categories = await as(request(server()).get('/categories?type=expense')).expect(200);
    categoryIds = categories.body.map((category: { id: string }) => category.id);

    const statement = await as(request(server()).post('/statements/manual-expense'))
      .field('amount', '42')
      .field('currency', 'KZT')
      .field('merchant', 'Corner shop')
      .field('categoryId', categoryIds[0])
      .field('date', '2026-05-01')
      .expect(201);
    const listed = await as(
      request(server()).get(`/transactions?statementId=${statement.body.id}`),
    ).expect(200);
    transactionId = listed.body.data[0].id;
  });

  afterAll(async () => {
    if (dataSource) {
      await deleteUserByEmail(dataSource, email);
    }
    await app.close();
  });

  it('records a hand-picked category as manual', async () => {
    const res = await as(request(server()).put(`/transactions/${transactionId}`))
      .send({ categoryId: categoryIds[1] })
      .expect(200);
    expect(res.body).toMatchObject({ categoryId: categoryIds[1], categorySource: 'manual' });

    const row = await dataSource.getRepository(Transaction).findOneByOrFail({ id: transactionId });
    expect(row.categoryId).toBe(categoryIds[1]);
    expect(row.categorySource).toBe('manual');
    expect(row.categoryReason).toBeNull();
  });

  it('keeps the manual pick through a bulk re-classification', async () => {
    const res = await as(request(server()).post('/classification/bulk'))
      .send({ transactionIds: [transactionId] })
      .expect(200);
    expect(res.body).toMatchObject({ total: 1, keptManual: 1, successful: 0 });

    const row = await dataSource.getRepository(Transaction).findOneByOrFail({ id: transactionId });
    expect(row.categoryId).toBe(categoryIds[1]);
    expect(row.categorySource).toBe('manual');
  });

  it('round-trips the processing switches', async () => {
    await as(request(server()).patch(`/workspaces/${owner.workspaceId}`))
      .send({ processing: { aiCategorization: false, merchantLearning: false } })
      .expect(200);

    const workspace = await as(request(server()).get(`/workspaces/${owner.workspaceId}`)).expect(
      200,
    );
    expect(workspace.body.settings.processing).toMatchObject({
      aiCategorization: false,
      aiMerchantNormalization: true,
      merchantLearning: false,
    });

    await as(request(server()).patch(`/workspaces/${owner.workspaceId}`))
      .send({ processing: { aiCategorization: 'no' } })
      .expect(400);
  });
});
