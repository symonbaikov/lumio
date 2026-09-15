import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import {
  deleteUserByEmail,
  type E2eAccount,
  e2eTestingModule,
  registerAccount,
} from './helpers/e2e-app';

/**
 * Workspace access end to end: who can read and change a workspace, the
 * invitation lifecycle, member roles and removal. Each test builds on the
 * state the previous ones leave, as a real team would.
 */
describe('Workspaces (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const stamp = Date.now();
  const emails = {
    owner: `ws-owner-${stamp}@example.com`,
    member: `ws-member-${stamp}@example.com`,
    outsider: `ws-outsider-${stamp}@example.com`,
    pending: `ws-pending-${stamp}@example.com`,
  };
  let owner: E2eAccount;
  let member: E2eAccount;
  let outsider: E2eAccount;
  let invitationToken: string;

  const as = (account: E2eAccount, req: request.Test) =>
    req.set('Authorization', `Bearer ${account.token}`);
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await e2eTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    owner = await registerAccount(app, emails.owner, 'Workspace Owner');
    member = await registerAccount(app, emails.member, 'Workspace Member');
    outsider = await registerAccount(app, emails.outsider, 'Workspace Outsider');
  });

  afterAll(async () => {
    if (dataSource) {
      for (const email of Object.values(emails)) {
        await deleteUserByEmail(dataSource, email);
      }
    }
    await app.close();
  });

  describe('GET /workspaces', () => {
    it('lists the workspaces the user belongs to', async () => {
      const res = await as(owner, request(server()).get('/workspaces')).expect(200);
      expect(res.body.map((workspace: { id: string }) => workspace.id)).toContain(
        owner.workspaceId,
      );
    });
  });

  describe('GET /workspaces/:id', () => {
    it('returns the workspace with the caller’s role', async () => {
      const res = await as(owner, request(server()).get(`/workspaces/${owner.workspaceId}`)).expect(
        200,
      );
      expect(res.body).toMatchObject({
        id: owner.workspaceId,
        ownerId: owner.userId,
        memberRole: 'owner',
      });
    });

    it('refuses a user who is not a member', () => {
      return as(outsider, request(server()).get(`/workspaces/${owner.workspaceId}`)).expect(403);
    });

    it('requires authentication', () => {
      return request(server()).get(`/workspaces/${owner.workspaceId}`).expect(401);
    });
  });

  describe('PATCH /workspaces/:id', () => {
    it('lets the owner rename the workspace', async () => {
      const res = await as(owner, request(server()).patch(`/workspaces/${owner.workspaceId}`))
        .send({ name: 'Renamed workspace' })
        .expect(200);
      expect(res.body.name).toBe('Renamed workspace');
    });

    it('rejects an empty name', () => {
      return as(owner, request(server()).patch(`/workspaces/${owner.workspaceId}`))
        .send({ name: '' })
        .expect(400);
    });

    it('refuses a user who is not a member', () => {
      return as(outsider, request(server()).patch(`/workspaces/${owner.workspaceId}`))
        .send({ name: 'Hijacked' })
        .expect(403);
    });
  });

  describe('invitations', () => {
    it('invites a user by email', async () => {
      const res = await as(
        owner,
        request(server()).post(`/workspaces/${owner.workspaceId}/invitations`),
      )
        .send({ email: member.email, role: 'member' })
        .expect(201);
      expect(res.body.invitation).toMatchObject({ email: member.email, status: 'pending' });
      invitationToken = res.body.invitation.token;
      expect(invitationToken).toEqual(expect.any(String));
    });

    it('rejects an invalid email', () => {
      return as(owner, request(server()).post(`/workspaces/${owner.workspaceId}/invitations`))
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('refreshes a pending invitation instead of creating a second one', async () => {
      const res = await as(
        owner,
        request(server()).post(`/workspaces/${owner.workspaceId}/invitations`),
      )
        .send({ email: member.email, role: 'member' })
        .expect(201);
      invitationToken = res.body.invitation.token;

      const list = await as(
        owner,
        request(server()).get(`/workspaces/${owner.workspaceId}/invitations`),
      ).expect(200);
      const forMember = list.body.filter(
        (invitation: { email: string }) => invitation.email === member.email,
      );
      expect(forMember).toHaveLength(1);
    });

    it('hides invitations from users who are not members', () => {
      return as(
        outsider,
        request(server()).get(`/workspaces/${owner.workspaceId}/invitations`),
      ).expect(403);
    });

    it('refuses an invitation accepted by a different account', () => {
      return as(
        outsider,
        request(server()).post(`/workspaces/invitations/${invitationToken}/accept`),
      ).expect(403);
    });

    it('adds the invited user when they accept', async () => {
      const res = await as(
        member,
        request(server()).post(`/workspaces/invitations/${invitationToken}/accept`),
      ).expect(200);
      expect(res.body.workspaceId).toBe(owner.workspaceId);

      const workspace = await as(
        member,
        request(server()).get(`/workspaces/${owner.workspaceId}`),
      ).expect(200);
      expect(workspace.body.memberRole).toBe('member');
    });

    it('rejects inviting someone who is already a member', () => {
      return as(owner, request(server()).post(`/workspaces/${owner.workspaceId}/invitations`))
        .send({ email: member.email })
        .expect(409);
    });

    it('lets the owner revoke a pending invitation', async () => {
      const invite = await as(
        owner,
        request(server()).post(`/workspaces/${owner.workspaceId}/invitations`),
      )
        .send({ email: emails.pending })
        .expect(201);

      await as(
        owner,
        request(server()).delete(
          `/workspaces/${owner.workspaceId}/invitations/${invite.body.invitation.id}`,
        ),
      ).expect(200);

      const list = await as(
        owner,
        request(server()).get(`/workspaces/${owner.workspaceId}/invitations`),
      ).expect(200);
      expect(list.body.map((invitation: { email: string }) => invitation.email)).not.toContain(
        emails.pending,
      );
    });
  });

  describe('member roles', () => {
    it('lets the owner change a member’s role', async () => {
      const res = await as(
        owner,
        request(server()).patch(`/workspaces/${owner.workspaceId}/members/${member.userId}/role`),
      )
        .send({ role: 'viewer' })
        .expect(200);
      expect(res.body.role).toBe('viewer');
    });

    it('rejects an unknown role', () => {
      return as(
        owner,
        request(server()).patch(`/workspaces/${owner.workspaceId}/members/${member.userId}/role`),
      )
        .send({ role: 'superuser' })
        .expect(400);
    });

    it('refuses role changes by a member who is not an admin', () => {
      return as(
        member,
        request(server()).patch(`/workspaces/${owner.workspaceId}/members/${owner.userId}/role`),
      )
        .send({ role: 'viewer' })
        .expect(403);
    });
  });

  describe('removing members', () => {
    it('refuses to remove the owner', () => {
      return as(
        owner,
        request(server()).delete(`/workspaces/${owner.workspaceId}/members/${owner.userId}`),
      ).expect(403);
    });

    it('lets the owner remove a member, who then loses access', async () => {
      await as(
        owner,
        request(server()).delete(`/workspaces/${owner.workspaceId}/members/${member.userId}`),
      ).expect(200);

      await as(member, request(server()).get(`/workspaces/${owner.workspaceId}`)).expect(403);
    });
  });
});
