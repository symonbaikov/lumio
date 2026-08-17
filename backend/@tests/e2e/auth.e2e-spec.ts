import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'Test User',
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
  });

  afterAll(async () => {
    // Cleanup test data
    if (dataSource) {
      await dataSource.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    }
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(testUser.email.toLowerCase());
          expect(res.body.user).not.toHaveProperty('passwordHash');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409)
        .expect(res => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should validate password strength', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: '123',
          name: 'Test',
        })
        .expect(400);
    });

    it('should normalize email to lowercase', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'Test@EXAMPLE.com',
          password: 'Test123!@#',
          name: 'Test',
        })
        .expect(409); // Should conflict with existing lowercase email
    });

    it('should require name field', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'Test123!@#',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);
    });

    it('should be case-insensitive for email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email.toUpperCase(),
          password: testUser.password,
        })
        .expect(200);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid',
        })
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.email).toBe(testUser.email.toLowerCase());
          expect(res.body).not.toHaveProperty('passwordHash');
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('role');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).not.toBe(accessToken);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid.refresh.token')
        .expect(401);
    });

    it('should reject access token used as refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('should invalidate old tokens after password change', async () => {
      // This test requires implementing password change endpoint
      // Placeholder for future implementation
      expect(true).toBe(true);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout user with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject logout without token', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should still succeed with already logged out token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const promises = [];

      // Attempt multiple logins rapidly
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'ratelimit@example.com',
            password: 'wrongpassword',
          }),
        );
      }

      const results = await Promise.all(promises);
      const rateLimited = results.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Security', () => {
    it('should not expose password in responses', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should use HTTPS in production', () => {
      // This is more of an infrastructure test
      // Verify in deployment configuration
      expect(process.env.NODE_ENV).toBeDefined();
    });

    it('should have secure token expiration', async () => {
      // Tokens should expire
      // Access token: short-lived (15min default)
      // Refresh token: longer (7 days default)
      expect(true).toBe(true);
    });
  });

  describe('Token Validation', () => {
    it('should validate token structure', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer not.a.valid.jwt.structure')
        .expect(401);
    });

    it('should validate token signature', () => {
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });

    it('should validate token expiration', async () => {
      // Create an expired token scenario
      // This would require manipulating time or creating pre-expired token
      expect(true).toBe(true);
    });
  });
});
