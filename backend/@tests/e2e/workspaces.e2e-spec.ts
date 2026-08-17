import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

describe('Workspaces (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ownerAccessToken: string;
  let memberAccessToken: string;
  let workspaceId: string;
  let invitationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Register owner
    const ownerRegister = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'workspace-owner@example.com',
      password: 'Test123!@#',
      firstName: 'Owner',
      lastName: 'Test',
    });

    const ownerLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'workspace-owner@example.com',
      password: 'Test123!@#',
    });

    ownerAccessToken = ownerLogin.body.accessToken;
    workspaceId = ownerLogin.body.user.workspaceId;

    // Register member
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'workspace-member@example.com',
      password: 'Test123!@#',
      firstName: 'Member',
      lastName: 'Test',
    });

    const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'workspace-member@example.com',
      password: 'Test123!@#',
    });

    memberAccessToken = memberLogin.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('GET /workspaces/:id', () => {
    it('should return workspace details', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.id).toBe(workspaceId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('members');
        });
    });

    it('should include workspace members', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body.members)).toBe(true);
          expect(res.body.members.length).toBeGreaterThan(0);
        });
    });

    it('should not allow accessing other workspaces', async () => {
      // Create another workspace
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'other-workspace@example.com',
        password: 'Test123!@#',
        firstName: 'Other',
        lastName: 'Workspace',
      });

      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-workspace@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(403);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get(`/workspaces/${workspaceId}`).expect(401);
    });
  });

  describe('PATCH /workspaces/:id', () => {
    it('should update workspace name', () => {
      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          name: 'Updated Workspace Name',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.name).toBe('Updated Workspace Name');
        });
    });

    it('should update workspace settings', () => {
      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          settings: {
            currency: 'USD',
            timezone: 'America/New_York',
          },
        })
        .expect(200)
        .expect(res => {
          expect(res.body.settings.currency).toBe('USD');
        });
    });

    it('should not allow non-owner updates', async () => {
      // First, invite and accept the member
      const inviteRes = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'workspace-member@example.com',
          role: 'MEMBER',
        });

      await request(app.getHttpServer())
        .post(`/workspaces/invitations/${inviteRes.body.id}/accept`)
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should validate update data', () => {
      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          name: '', // Empty name should fail
        })
        .expect(400);
    });
  });

  describe('POST /workspaces/:id/invitations', () => {
    it('should create workspace invitation', () => {
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'invited@example.com',
          role: 'MEMBER',
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('invited@example.com');
          expect(res.body.role).toBe('MEMBER');
          invitationId = res.body.id;
        });
    });

    it('should send invitation email', () => {
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'email-test@example.com',
          role: 'MEMBER',
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('emailSent');
        });
    });

    it('should validate invitation data', () => {
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'invalid-email', // Invalid email
          role: 'MEMBER',
        })
        .expect(400);
    });

    it('should not allow duplicate invitations', async () => {
      const email = 'duplicate@example.com';

      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email,
          role: 'MEMBER',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email,
          role: 'MEMBER',
        })
        .expect(400);
    });

    it('should not allow inviting existing members', async () => {
      // Member is already in workspace from previous test
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'workspace-member@example.com',
          role: 'MEMBER',
        })
        .expect(400);
    });

    it('should allow inviting with different roles', () => {
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'admin@example.com',
          role: 'ADMIN',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.role).toBe('ADMIN');
        });
    });

    it('should not allow non-admin/owner invitations', async () => {
      return request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .send({
          email: 'unauthorized@example.com',
          role: 'MEMBER',
        })
        .expect(403);
    });
  });

  describe('GET /workspaces/:id/invitations', () => {
    it('should list workspace invitations', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter pending invitations', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/invitations?status=PENDING`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200)
        .expect(res => {
          res.body.forEach(invite => {
            expect(invite.status).toBe('PENDING');
          });
        });
    });

    it('should not allow non-members to view invitations', async () => {
      const otherLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'other-workspace@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(403);
    });
  });

  describe('POST /workspaces/invitations/:id/accept', () => {
    it('should accept workspace invitation', async () => {
      // Register new user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'invited@example.com',
        password: 'Test123!@#',
        firstName: 'Invited',
        lastName: 'User',
      });

      const invitedLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'invited@example.com',
        password: 'Test123!@#',
      });

      if (invitationId) {
        return request(app.getHttpServer())
          .post(`/workspaces/invitations/${invitationId}/accept`)
          .set('Authorization', `Bearer ${invitedLogin.body.accessToken}`)
          .expect(200)
          .expect(res => {
            expect(res.body.status).toBe('ACCEPTED');
          });
      }
    });

    it('should not accept expired invitations', async () => {
      // Create expired invitation (mock or set expiration in past)
      const expiredInvite = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'expired@example.com',
          role: 'MEMBER',
          expiresAt: new Date('2020-01-01'),
        });

      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'expired@example.com',
        password: 'Test123!@#',
        firstName: 'Expired',
        lastName: 'User',
      });

      const expiredLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'expired@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .post(`/workspaces/invitations/${expiredInvite.body.id}/accept`)
        .set('Authorization', `Bearer ${expiredLogin.body.accessToken}`)
        .expect(400);
    });

    it('should update user workspace on accept', async () => {
      const result = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${memberAccessToken}`);

      expect(result.body.workspaceId).toBe(workspaceId);
    });
  });

  describe('POST /workspaces/invitations/:id/decline', () => {
    it('should decline workspace invitation', async () => {
      const invite = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          email: 'decline-test@example.com',
          role: 'MEMBER',
        });

      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'decline-test@example.com',
        password: 'Test123!@#',
        firstName: 'Decline',
        lastName: 'Test',
      });

      const declineLogin = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'decline-test@example.com',
        password: 'Test123!@#',
      });

      return request(app.getHttpServer())
        .post(`/workspaces/invitations/${invite.body.id}/decline`)
        .set('Authorization', `Bearer ${declineLogin.body.accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.status).toBe('DECLINED');
        });
    });
  });

  describe('DELETE /workspaces/:id/members/:memberId', () => {
    it('should remove workspace member', async () => {
      // Get member to remove
      const workspace = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`);

      const memberToRemove = workspace.body.members.find(
        m => m.email !== 'workspace-owner@example.com',
      );

      if (memberToRemove) {
        return request(app.getHttpServer())
          .delete(`/workspaces/${workspaceId}/members/${memberToRemove.id}`)
          .set('Authorization', `Bearer ${ownerAccessToken}`)
          .expect(200);
      }
    });

    it('should not allow non-owner removals', () => {
      return request(app.getHttpServer())
        .delete(`/workspaces/${workspaceId}/members/some-id`)
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .expect(403);
    });

    it('should not allow removing owner', async () => {
      const workspace = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`);

      const owner = workspace.body.members.find(m => m.role === 'OWNER');

      if (owner) {
        return request(app.getHttpServer())
          .delete(`/workspaces/${workspaceId}/members/${owner.id}`)
          .set('Authorization', `Bearer ${ownerAccessToken}`)
          .expect(400);
      }
    });
  });

  describe('PATCH /workspaces/:id/members/:memberId/role', () => {
    it('should update member role', async () => {
      const workspace = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`);

      const member = workspace.body.members.find(
        m => m.role === 'MEMBER' && m.email !== 'workspace-owner@example.com',
      );

      if (member) {
        return request(app.getHttpServer())
          .patch(`/workspaces/${workspaceId}/members/${member.id}/role`)
          .set('Authorization', `Bearer ${ownerAccessToken}`)
          .send({
            role: 'ADMIN',
          })
          .expect(200)
          .expect(res => {
            expect(res.body.role).toBe('ADMIN');
          });
      }
    });

    it('should validate role value', async () => {
      const workspace = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerAccessToken}`);

      const member = workspace.body.members[0];

      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/members/${member.id}/role`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .send({
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });

    it('should not allow non-owner role changes', () => {
      return request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/members/some-id/role`)
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .send({
          role: 'ADMIN',
        })
        .expect(403);
    });
  });

  describe('GET /workspaces/:id/activity', () => {
    it('should return workspace activity log', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter activity by type', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity?type=MEMBER_JOINED`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200);
    });

    it('should paginate activity', () => {
      return request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/activity?page=1&limit=10`)
        .set('Authorization', `Bearer ${ownerAccessToken}`)
        .expect(200);
    });
  });
});
