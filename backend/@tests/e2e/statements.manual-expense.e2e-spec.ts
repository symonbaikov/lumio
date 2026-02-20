jest.mock('franc', () => ({
  franc: () => 'und',
}));

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn().mockImplementation(() => ({})),
}));

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

describe('Statements manual expense (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;
  let workspaceId: string;

  const testUser = {
    email: `manual-expense-e2e-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Manual Expense E2E User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(testUser);
    userId = registerRes.body.user.id;

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    accessToken = loginRes.body.accessToken;
    workspaceId = loginRes.body.user.workspaceId;
  });

  afterAll(async () => {
    if (dataSource && userId) {
      await dataSource.query(
        `DELETE FROM transactions WHERE statement_id IN (SELECT id FROM statements WHERE user_id = $1)`,
        [userId],
      );
      await dataSource.query(`DELETE FROM statements WHERE user_id = $1`, [userId]);
      await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }

    await app.close();
  });

  it('creates manual expense and stores related transaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/statements/manual-expense')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', workspaceId)
      .field('amount', '222')
      .field('currency', 'KZT')
      .field('merchant', 'adad')
      .field('description', 'ada')
      .field('date', '2026-02-20')
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('completed');
    expect(Number(response.body.totalTransactions)).toBe(1);
    expect(Number(response.body.totalDebit)).toBe(222);
    expect(response.body.currency).toBe('KZT');

    const transactionRows = await dataSource.query(
      `SELECT statement_id, counterparty_name, payment_purpose, debit, transaction_type, currency
       FROM transactions
       WHERE statement_id = $1`,
      [response.body.id],
    );

    expect(transactionRows).toHaveLength(1);
    expect(transactionRows[0].statement_id).toBe(response.body.id);
    expect(transactionRows[0].counterparty_name).toBe('adad');
    expect(transactionRows[0].payment_purpose).toBe('ada');
    expect(Number(transactionRows[0].debit)).toBe(222);
    expect(transactionRows[0].transaction_type).toBe('expense');
    expect(transactionRows[0].currency).toBe('KZT');
  });
});
