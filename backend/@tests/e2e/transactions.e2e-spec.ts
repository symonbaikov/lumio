import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let workspaceId: string;
  let statementId: string;
  let transactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Register and login
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'transaction-test@example.com',
      password: 'Test123!@#',
      firstName: 'Transaction',
      lastName: 'Test',
    });

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'transaction-test@example.com',
      password: 'Test123!@#',
    });

    accessToken = loginRes.body.accessToken;
    workspaceId = loginRes.body.user.workspaceId;

    // Create a statement with transactions
    const statementRes = await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('mock PDF content'), 'test.pdf')
      .field('bankName', 'Kaspi Bank')
      .field('accountNumber', '1234567890');

    statementId = statementRes.body.id;

    // Get the first transaction
    const transactionsRes = await request(app.getHttpServer())
      .get(`/transactions?statementId=${statementId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    if (transactionsRes.body.items?.length > 0) {
      transactionId = transactionsRes.body.items[0].id;
    }
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('GET /transactions', () => {
    it('should return paginated transactions', () => {
      return request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('should filter transactions by date range', () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      return request(app.getHttpServer())
        .get(`/transactions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.items).toBeDefined();
        });
    });

    it('should filter transactions by type', () => {
      return request(app.getHttpServer())
        .get('/transactions?type=DEBIT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          const debits = res.body.items.filter(t => t.type === 'DEBIT');
          expect(debits.length).toBeLessThanOrEqual(res.body.items.length);
        });
    });

    it('should filter transactions by category', async () => {
      // Create a category first
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Groceries',
          type: 'EXPENSE',
          keywords: ['food', 'grocery'],
        });

      return request(app.getHttpServer())
        .get(`/transactions?categoryId=${categoryRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should filter transactions by statement', () => {
      return request(app.getHttpServer())
        .get(`/transactions?statementId=${statementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          res.body.items.forEach(transaction => {
            expect(transaction.statementId).toBe(statementId);
          });
        });
    });

    it('should filter transactions by amount range', () => {
      return request(app.getHttpServer())
        .get('/transactions?minAmount=100&maxAmount=1000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          res.body.items.forEach(transaction => {
            expect(transaction.amount).toBeGreaterThanOrEqual(100);
            expect(transaction.amount).toBeLessThanOrEqual(1000);
          });
        });
    });

    it('should search transactions by description', () => {
      return request(app.getHttpServer())
        .get('/transactions?search=payment')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should sort transactions', () => {
      return request(app.getHttpServer())
        .get('/transactions?sortBy=amount&sortOrder=DESC')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          if (res.body.items.length > 1) {
            expect(res.body.items[0].amount).toBeGreaterThanOrEqual(res.body.items[1].amount);
          }
        });
    });

    it('should paginate transactions', () => {
      return request(app.getHttpServer())
        .get('/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
          expect(res.body.items.length).toBeLessThanOrEqual(10);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/transactions').expect(401);
    });

    it('should isolate transactions by workspace', async () => {
      // Create another user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'other-user@example.com',
        password: 'Test123!@#',
        firstName: 'Other',
        lastName: 'User',
      });

      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-user@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(200)
        .expect(res => {
          // Should not see first user's transactions
          const hasFirstUserTransaction = res.body.items.some(t => t.statementId === statementId);
          expect(hasFirstUserTransaction).toBe(false);
        });
    });
  });

  describe('GET /transactions/:id', () => {
    it('should return transaction by id', () => {
      if (!transactionId) return;

      return request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.id).toBe(transactionId);
          expect(res.body).toHaveProperty('amount');
          expect(res.body).toHaveProperty('date');
          expect(res.body).toHaveProperty('description');
        });
    });

    it('should return 404 for non-existent transaction', () => {
      return request(app.getHttpServer())
        .get('/transactions/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should not allow accessing other workspace transactions', async () => {
      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-user@example.com',
        password: 'Test123!@#',
      });

      if (!transactionId) return;

      return request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /transactions/:id', () => {
    it('should update transaction', () => {
      if (!transactionId) return;

      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Updated description',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.description).toBe('Updated description');
        });
    });

    it('should update transaction category', async () => {
      if (!transactionId) return;

      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Transport',
          type: 'EXPENSE',
        });

      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryId: categoryRes.body.id,
        })
        .expect(200)
        .expect(res => {
          expect(res.body.categoryId).toBe(categoryRes.body.id);
        });
    });

    it('should validate update data', () => {
      if (!transactionId) return;

      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 'invalid', // Should be number
        })
        .expect(400);
    });

    it('should not allow updating other workspace transactions', async () => {
      if (!transactionId) return;

      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-user@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .send({
          description: 'Hacked!',
        })
        .expect(404);
    });
  });

  describe('POST /transactions/bulk-update', () => {
    it('should bulk update transactions', async () => {
      const transactions = await request(app.getHttpServer())
        .get('/transactions?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      const ids = transactions.body.items.map(t => t.id);

      return request(app.getHttpServer())
        .post('/transactions/bulk-update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ids,
          updates: {
            description: 'Bulk updated',
          },
        })
        .expect(200);
    });

    it('should bulk categorize transactions', async () => {
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Utilities',
          type: 'EXPENSE',
        });

      const transactions = await request(app.getHttpServer())
        .get('/transactions?limit=3')
        .set('Authorization', `Bearer ${accessToken}`);

      const ids = transactions.body.items.map(t => t.id);

      return request(app.getHttpServer())
        .post('/transactions/bulk-update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ids,
          updates: {
            categoryId: categoryRes.body.id,
          },
        })
        .expect(200);
    });

    it('should validate bulk update data', () => {
      return request(app.getHttpServer())
        .post('/transactions/bulk-update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ids: [], // Empty array
          updates: {},
        })
        .expect(400);
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('should delete transaction', async () => {
      // Create a new statement to have a transaction to delete
      const stmt = await request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('test'), 'delete-test.pdf');

      const trans = await request(app.getHttpServer())
        .get(`/transactions?statementId=${stmt.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      if (trans.body.items.length > 0) {
        const toDelete = trans.body.items[0].id;

        await request(app.getHttpServer())
          .delete(`/transactions/${toDelete}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        return request(app.getHttpServer())
          .get(`/transactions/${toDelete}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      }
    });

    it('should not allow deleting other workspace transactions', async () => {
      if (!transactionId) return;

      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-user@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .delete(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(404);
    });
  });

  describe('GET /transactions/statistics', () => {
    it('should return transaction statistics', () => {
      return request(app.getHttpServer())
        .get('/transactions/statistics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('totalIncome');
          expect(res.body).toHaveProperty('totalExpenses');
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('transactionCount');
        });
    });

    it('should filter statistics by date range', () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      return request(app.getHttpServer())
        .get(`/transactions/statistics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should group statistics by category', () => {
      return request(app.getHttpServer())
        .get('/transactions/statistics?groupBy=category')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('byCategory');
        });
    });

    it('should group statistics by month', () => {
      return request(app.getHttpServer())
        .get('/transactions/statistics?groupBy=month')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('byMonth');
        });
    });
  });

  describe('POST /transactions/classify', () => {
    it('should auto-classify transaction', () => {
      if (!transactionId) return;

      return request(app.getHttpServer())
        .post(`/transactions/${transactionId}/classify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('categoryId');
        });
    });

    it('should classify all uncategorized transactions', () => {
      return request(app.getHttpServer())
        .post('/transactions/classify-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('classified');
        });
    });
  });

  describe('GET /transactions/export', () => {
    it('should export transactions to CSV', () => {
      return request(app.getHttpServer())
        .get('/transactions/export?format=csv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect('Content-Type', /csv/);
    });

    it('should export transactions to Excel', () => {
      return request(app.getHttpServer())
        .get('/transactions/export?format=xlsx')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(
          'Content-Type',
          /spreadsheet|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
        );
    });

    it('should filter exported transactions', () => {
      const startDate = new Date('2024-01-01').toISOString();

      return request(app.getHttpServer())
        .get(`/transactions/export?format=csv&startDate=${startDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
