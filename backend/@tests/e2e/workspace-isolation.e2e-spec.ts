jest.mock('franc', () => ({
  franc: () => 'und',
}));

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

interface ListedReceipt {
  id: string;
}

/**
 * One user in two workspaces must see each workspace's data only there. The
 * current workspace is the `x-workspace-id` header; the user's own
 * `workspaceId` is merely the workspace they registered with, and switching
 * never changes it, so nothing may be scoped by it or by the user alone.
 */
describe('Workspace isolation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const stamp = Date.now();
  const emails = {
    owner: `iso-owner-${stamp}@example.com`,
    member: `iso-member-${stamp}@example.com`,
    other: `iso-other-${stamp}@example.com`,
  };
  let owner: E2eAccount;
  let member: E2eAccount;
  let other: E2eAccount;
  /** The owner's second workspace; `owner.workspaceId` is the first. */
  let secondWorkspaceId: string;
  /** A scan the owner uploaded into the second workspace. */
  let receiptId: string;

  const as = (account: E2eAccount, req: request.Test, workspaceId = account.workspaceId) =>
    req.set('Authorization', `Bearer ${account.token}`).set('x-workspace-id', workspaceId);
  const server = () => app.getHttpServer();
  const listed = (res: request.Response) =>
    (res.body.receipts as ListedReceipt[]).map(receipt => receipt.id);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await e2eTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    owner = await registerAccount(app, emails.owner, 'Isolation Owner');
    member = await registerAccount(app, emails.member, 'Isolation Member');
    other = await registerAccount(app, emails.other, 'Isolation Other');

    const created = await request(server())
      .post('/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Second workspace' })
      .expect(201);
    secondWorkspaceId = created.body.id;

    const invitation = await as(
      owner,
      request(server()).post(`/workspaces/${secondWorkspaceId}/invitations`),
      secondWorkspaceId,
    )
      .send({ email: member.email, role: 'member' })
      .expect(201);
    await as(
      member,
      request(server()).post(`/workspaces/invitations/${invitation.body.invitation.token}/accept`),
    ).expect(200);

    // Inserted directly: the upload path runs OCR, which is beside the point here.
    const [row] = await dataSource.query(
      `INSERT INTO receipts (user_id, workspace_id, source, subject, sender, received_at, status, parsed_data)
       VALUES ($1, $2, 'scan', 'Scan', 'upload', now(), 'draft', $3)
       RETURNING id`,
      [
        owner.userId,
        secondWorkspaceId,
        JSON.stringify({ amount: 12.5, currency: 'EUR', date: '2026-09-01', vendor: 'Iso Cafe' }),
      ],
    );
    receiptId = row.id;
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query(
        'DELETE FROM transactions WHERE id IN (SELECT transaction_id FROM receipts WHERE user_id = $1)',
        [owner?.userId],
      );
      for (const email of Object.values(emails)) {
        await deleteUserByEmail(dataSource, email);
      }
    }
    await app.close();
  });

  describe('Gmail receipts list', () => {
    const list = '/integrations/gmail/receipts?includeLinkedScans=true';

    it('shows the receipt in the workspace it was uploaded to', async () => {
      const res = await as(owner, request(server()).get(list), secondWorkspaceId).expect(200);
      expect(listed(res)).toContain(receiptId);
    });

    it('hides it from the same user’s other workspace', async () => {
      const res = await as(owner, request(server()).get(list)).expect(200);
      expect(listed(res)).not.toContain(receiptId);
    });

    it('shows it to another member of that workspace', async () => {
      const res = await as(member, request(server()).get(list), secondWorkspaceId).expect(200);
      expect(listed(res)).toContain(receiptId);
    });

    it('hides it from another user’s workspace', async () => {
      const res = await as(other, request(server()).get(list)).expect(200);
      expect(listed(res)).not.toContain(receiptId);
    });

    it('refuses a workspace the caller is not a member of', () => {
      return as(other, request(server()).get(list), secondWorkspaceId).expect(403);
    });

    it('requires a workspace', () => {
      return request(server())
        .get(list)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(403);
    });
  });

  describe('Gmail receipt by id', () => {
    it('finds it in its own workspace', async () => {
      const res = await as(
        owner,
        request(server()).get(`/integrations/gmail/receipts/${receiptId}`),
        secondWorkspaceId,
      ).expect(200);
      expect(res.body.receipt.id).toBe(receiptId);
    });

    it('does not find it from the other workspace', () => {
      return as(owner, request(server()).get(`/integrations/gmail/receipts/${receiptId}`)).expect(
        400,
      );
    });

    it('does not serve its file or thumbnail from the other workspace', async () => {
      for (const suffix of ['file', 'thumbnail']) {
        const res = await as(
          owner,
          request(server()).get(`/integrations/gmail/receipts/${receiptId}/${suffix}`),
        ).expect(404);
        expect(res.body).toEqual({ error: 'Receipt not found' });
      }
    });

    it('cannot be edited from the other workspace', async () => {
      await as(owner, request(server()).patch(`/integrations/gmail/receipts/${receiptId}`))
        .send({ parsedData: { vendor: 'Hijacked' } })
        .expect(400);

      const [row] = await dataSource.query('SELECT parsed_data FROM receipts WHERE id = $1', [
        receiptId,
      ]);
      expect(row.parsed_data.vendor).toBe('Iso Cafe');
    });

    it('cannot be approved from the other workspace', () => {
      return as(owner, request(server()).post(`/integrations/gmail/receipts/${receiptId}/approve`))
        .send({ amount: 12.5, date: '2026-09-01', description: 'Iso Cafe' })
        .expect(400);
    });

    it('books the approved transaction into the receipt’s workspace', async () => {
      const res = await as(
        owner,
        request(server()).post(`/integrations/gmail/receipts/${receiptId}/approve`),
        secondWorkspaceId,
      )
        .send({ amount: 12.5, date: '2026-09-01', currency: 'EUR', description: 'Iso Cafe' })
        .expect(201);

      const [row] = await dataSource.query('SELECT workspace_id FROM transactions WHERE id = $1', [
        res.body.transaction.id,
      ]);
      expect(row.workspace_id).toBe(secondWorkspaceId);
    });
  });
});
