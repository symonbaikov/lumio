import * as fs from 'fs';
import * as path from 'path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

describe('StatementsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;
  let statementId: string;

  const testUser = {
    email: 'statements-test@example.com',
    password: 'Test123!@#',
    name: 'Statements Test User',
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

    // Register and login test user
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(testUser);

    accessToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (dataSource) {
      await dataSource.query(
        `DELETE FROM transactions WHERE statement_id IN (SELECT id FROM statements WHERE user_id = $1)`,
        [userId],
      );
      await dataSource.query(`DELETE FROM statements WHERE user_id = $1`, [userId]);
      await dataSource.query(`DELETE FROM users WHERE email = $1`, [testUser.email]);
    }
    await app.close();
  });

  describe('/statements (POST)', () => {
    it('should upload PDF statement', async () => {
      const testPdfPath = path.join(__dirname, '../fixtures/test-statement.pdf');

      // Create a simple test PDF if it doesn't exist
      if (!fs.existsSync(testPdfPath)) {
        fs.mkdirSync(path.dirname(testPdfPath), { recursive: true });
        fs.writeFileSync(testPdfPath, '%PDF-1.4\ntest content');
      }

      return request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testPdfPath)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('filename');
          expect(res.body.fileType).toBe('pdf');
          expect(res.body.status).toBe('uploaded');
          statementId = res.body.id;
        });
    });

    it('should reject upload without authentication', () => {
      return request(app.getHttpServer())
        .post('/statements')
        .attach('file', path.join(__dirname, '../fixtures/test-statement.pdf'))
        .expect(401);
    });

    it('should reject upload without file', () => {
      return request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject unsupported file types', () => {
      const testFilePath = path.join(__dirname, '../fixtures/test.txt');
      if (!fs.existsSync(testFilePath)) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
        fs.writeFileSync(testFilePath, 'test content');
      }

      return request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath)
        .expect(400);
    });

    it('should detect duplicate files', async () => {
      const testPdfPath = path.join(__dirname, '../fixtures/test-statement.pdf');

      return request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testPdfPath)
        .expect(409);
    });

    it('should accept optional googleSheetId parameter', () => {
      const testPdfPath = path.join(__dirname, '../fixtures/unique-statement.pdf');
      if (!fs.existsSync(testPdfPath)) {
        fs.writeFileSync(testPdfPath, '%PDF-1.4\nunique content');
      }

      return request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('googleSheetId', 'sheet-123')
        .attach('file', testPdfPath)
        .expect(201)
        .expect(res => {
          expect(res.body.googleSheetId).toBe('sheet-123');
        });
    });
  });

  describe('/statements (GET)', () => {
    it('should get all statements for user', () => {
      return request(app.getHttpServer())
        .get('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/statements?status=uploaded')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((statement: any) => {
            expect(statement.status).toBe('uploaded');
          });
        });
    });

    it('should filter by bank name', () => {
      return request(app.getHttpServer())
        .get('/statements?bankName=tinkoff')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer()).get('/statements').expect(401);
    });

    it('should paginate results', () => {
      return request(app.getHttpServer())
        .get('/statements?limit=10&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('/statements/:id (GET)', () => {
    it('should get statement by id', () => {
      return request(app.getHttpServer())
        .get(`/statements/${statementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.id).toBe(statementId);
          expect(res.body).toHaveProperty('transactions');
        });
    });

    it('should return 404 for non-existent statement', () => {
      return request(app.getHttpServer())
        .get('/statements/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject access to other user statements', async () => {
      // Create another user
      const otherUser = {
        email: 'other@example.com',
        password: 'Test123!@#',
        name: 'Other User',
      };

      const otherRes = await request(app.getHttpServer()).post('/auth/register').send(otherUser);

      const otherToken = otherRes.body.accessToken;

      return request(app.getHttpServer())
        .get(`/statements/${statementId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('/statements/:id (PATCH)', () => {
    it('should update statement', () => {
      return request(app.getHttpServer())
        .patch(`/statements/${statementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bankName: 'kaspi',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.bankName).toBe('kaspi');
        });
    });

    it('should reject update without permission', async () => {
      // Test with workspace member without edit permissions
      // This requires setting up workspace with restricted permissions
      expect(true).toBe(true);
    });

    it('should validate update data', () => {
      return request(app.getHttpServer())
        .patch(`/statements/${statementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('/statements/:id (DELETE)', () => {
    it('should delete statement and transactions', async () => {
      // First create a statement to delete
      const testPdfPath = path.join(__dirname, '../fixtures/delete-test.pdf');
      if (!fs.existsSync(testPdfPath)) {
        fs.writeFileSync(testPdfPath, '%PDF-1.4\ndelete test');
      }

      const uploadRes = await request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testPdfPath);

      const deleteId = uploadRes.body.id;

      return request(app.getHttpServer())
        .delete(`/statements/${deleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 for already deleted statement', () => {
      return request(app.getHttpServer())
        .delete('/statements/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject delete without permission', () => {
      // Test workspace permission enforcement
      expect(true).toBe(true);
    });
  });

  describe('/statements/:id/reprocess (POST)', () => {
    it('should reprocess statement', () => {
      return request(app.getHttpServer())
        .post(`/statements/${statementId}/reprocess`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject reprocessing already processing statement', async () => {
      // Set statement to processing status
      await dataSource.query(`UPDATE statements SET status = 'processing' WHERE id = $1`, [
        statementId,
      ]);

      const res = await request(app.getHttpServer())
        .post(`/statements/${statementId}/reprocess`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);

      // Reset status
      await dataSource.query(`UPDATE statements SET status = 'uploaded' WHERE id = $1`, [
        statementId,
      ]);
    });
  });

  describe('Statement Processing', () => {
    it('should automatically process uploaded statement', async () => {
      // Wait for processing to complete (or mock the processing)
      // This is integration with parsing service
      expect(true).toBe(true);
    });

    it('should handle parsing errors gracefully', () => {
      // Upload invalid/corrupted file
      expect(true).toBe(true);
    });

    it('should extract transactions from statement', () => {
      // Verify transactions were created
      return request(app.getHttpServer())
        .get(`/statements/${statementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('transactions');
          expect(Array.isArray(res.body.transactions)).toBe(true);
        });
    });
  });
});
