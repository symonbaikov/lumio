import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DashboardService } from '../../src/modules/dashboard/dashboard.service';
import { SheetSourceLoaderService } from '../../src/modules/google-sheets/services/sheet-source-loader.service';

/**
 * Fixed 20-row ru budget sheet (date | description | category | amount):
 * 18 valid expense rows on distinct dates, 1 row with an unparseable date,
 * and 1 row that's an exact in-file duplicate of the first valid row
 * (same date/amount/description -> same dedup key per map-sheet-rows.ts).
 */
const buildSheetValues = (): unknown[][] => {
  const descriptions = [
    'Продукты',
    'Такси',
    'Кафе',
    'Аптека',
    'Коммуналка',
    'Интернет',
    'Кино',
    'Одежда',
    'Спортзал',
    'Книги',
    'Подарки',
    'Транспорт',
    'Ресторан',
    'Автомойка',
    'Парковка',
    'Мобильная связь',
    'Хозтовары',
    'Развлечения',
  ];

  // 2026-08-17 is "today" in this environment; keep every date within the
  // dashboard's default 30-day window (2026-07-19..2026-08-17).
  const baseDate = Date.UTC(2026, 6, 20); // 2026-07-20
  const formatDate = (ms: number): string => {
    const d = new Date(ms);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getUTCFullYear()}`;
  };

  const validRows = descriptions.map((desc, i) => [
    formatDate(baseDate + i * 86400000),
    desc,
    'Общее',
    i === 0 ? '-1 200,50' : `-${(100 + i * 25.5).toFixed(2)}`,
  ]);

  const duplicateOfFirstRow = [...validRows[0]];
  const invalidDateRow = ['not-a-date', 'Ошибка', 'Другое', '-50'];

  return [
    ['Дата', 'Описание', 'Категория', 'Сумма'],
    ...validRows,
    duplicateOfFirstRow,
    invalidDateRow,
  ];
};

const buildLoadedSheetSource = () => {
  const values = buildSheetValues();
  return {
    spreadsheetId: 'test-spreadsheet-id',
    worksheetName: 'Бюджет',
    values,
    effectiveRange: `'Бюджет'!A1:D${values.length}`,
    bounds: { sheetName: 'Бюджет', startRow: 1, startCol: 1, endRow: values.length, endCol: 4 },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id',
  };
};

const sheetImportBody = {
  sourceUrl: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id',
  roles: ['date', 'description', 'category', 'amount'],
  defaultCurrency: 'KZT',
};

describe('Sheets transaction import (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let accessTokenA: string;
  let workspaceIdA: string;
  let userIdA: string;

  let accessTokenB: string;
  let workspaceIdB: string;
  let userIdB: string;

  const loadMock = jest.fn().mockResolvedValue(buildLoadedSheetSource());

  const registerAndLogin = async (email: string) => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'Test123!@#',
      name: 'Sheets Import',
    });
    const userId: string = registerRes.body.user.id;

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password: 'Test123!@#',
    });

    return {
      userId,
      accessToken: loginRes.body.access_token as string,
      workspaceId: loginRes.body.user.workspaceId as string,
    };
  };

  const pollJob = async (jobId: string, accessToken: string, workspaceId: string) => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get(`/import/jobs/${jobId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-workspace-id', workspaceId);

      if (res.body.status === 'done' || res.body.status === 'failed') {
        return res.body;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Job ${jobId} did not finish within the poll deadline`);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SheetSourceLoaderService)
      .useValue({ load: loadMock })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    const userA = await registerAndLogin(`sheets-import-e2e-a-${Date.now()}@example.com`);
    userIdA = userA.userId;
    accessTokenA = userA.accessToken;
    workspaceIdA = userA.workspaceId;

    const userB = await registerAndLogin(`sheets-import-e2e-b-${Date.now()}@example.com`);
    userIdB = userB.userId;
    accessTokenB = userB.accessToken;
    workspaceIdB = userB.workspaceId;
  }, 30000);

  afterAll(async () => {
    try {
      if (dataSource) {
        for (const userId of [userIdA, userIdB]) {
          if (!userId) continue;
          await dataSource.query(
            'DELETE FROM transactions WHERE statement_id IN (SELECT id FROM statements WHERE user_id = $1)',
            [userId],
          );
          await dataSource.query(
            'DELETE FROM import_sessions WHERE user_id = $1',
            [userId],
          );
          await dataSource.query('DELETE FROM statements WHERE user_id = $1', [userId]);
          await dataSource.query('DELETE FROM categories WHERE user_id = $1', [userId]);
          await dataSource.query('DELETE FROM workspace_members WHERE user_id = $1', [userId]);
          await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      }
    } finally {
      // Always close, even if cleanup above threw — otherwise the full AppModule's
      // background @Interval schedulers (job processors, etc.) never get torn down
      // and the Jest process hangs indefinitely after the test run finishes.
      await app.close();
    }
  });

  it('previews the sheet: 18 ok, 1 invalid date, 1 in-file duplicate', async () => {
    const res = await request(app.getHttpServer())
      .post('/import/google-sheets/transactions/preview')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('x-workspace-id', workspaceIdA)
      .send(sheetImportBody)
      .expect(201);

    expect(res.body.summary).toMatchObject({
      total: 20,
      ok: 18,
      invalid: 2,
      skipped: 0,
    });

    const invalidRows = res.body.rows.filter((r: { status: string }) => r.status === 'invalid');
    expect(invalidRows).toHaveLength(2);
    expect(invalidRows.some((r: { issues: string[] }) => r.issues.includes('invalid_date'))).toBe(
      true,
    );
    expect(
      invalidRows.some((r: { issues: string[] }) => r.issues.includes('duplicate_in_file')),
    ).toBe(true);
  }, 30000);

  it('commits the sheet: 18 transactions with a shared statement_id and fingerprints', async () => {
    const commitRes = await request(app.getHttpServer())
      .post('/import/google-sheets/transactions/commit')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('x-workspace-id', workspaceIdA)
      .send({ ...sheetImportBody, name: 'RU Budget Import Test' })
      .expect(201);

    const jobId = commitRes.body.jobId;
    expect(jobId).toBeTruthy();

    const job = await pollJob(jobId, accessTokenA, workspaceIdA);
    expect(job.status).toBe('done');
    expect(job.result.imported).toBe(18);

    const rows = await dataSource.query(
      `SELECT statement_id, fingerprint FROM transactions WHERE workspace_id = $1`,
      [workspaceIdA],
    );
    expect(rows).toHaveLength(18);

    const statementIds = new Set(rows.map((r: { statement_id: string }) => r.statement_id));
    expect(statementIds.size).toBe(1);
    expect([...statementIds][0]).toBeTruthy();

    for (const row of rows) {
      expect(row.fingerprint).toBeTruthy();
    }
  }, 30000);

  it('re-commits the same sheet idempotently: 0 new rows, all matched', async () => {
    // The import session is keyed by the sheet's fileHash and reused across
    // calls; re-running the flow (preview, then commit) against the same
    // content is the intended re-import path, and must be idempotent per
    // .claude/rules/idempotency.md.
    const previewRes = await request(app.getHttpServer())
      .post('/import/google-sheets/transactions/preview')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('x-workspace-id', workspaceIdA)
      .send(sheetImportBody)
      .expect(201);

    expect(previewRes.body.summary.duplicateCount).toBe(18);
    const matchedRows = previewRes.body.rows.filter(
      (r: { sessionStatus?: string }) => r.sessionStatus === 'matched',
    );
    expect(matchedRows).toHaveLength(18);

    const commitRes = await request(app.getHttpServer())
      .post('/import/google-sheets/transactions/commit')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('x-workspace-id', workspaceIdA)
      .send({ ...sheetImportBody, name: 'RU Budget Import Test' })
      .expect(201);

    const jobId = commitRes.body.jobId;
    const job = await pollJob(jobId, accessTokenA, workspaceIdA);
    expect(job.status).toBe('done');
    expect(job.result.imported).toBe(0);
    expect(job.result.duplicates).toBe(18);

    const rows = await dataSource.query(
      `SELECT id FROM transactions WHERE workspace_id = $1`,
      [workspaceIdA],
    );
    expect(rows).toHaveLength(18);
  }, 30000);

  it('shows the imported transactions in the dashboard SUM(debit) for the workspace', async () => {
    const dashboardService = app.get(DashboardService);
    const dashboard = await dashboardService.getDashboard(userIdA, workspaceIdA, '30d');

    expect(dashboard.snapshot.expense30d).toBeGreaterThan(0);
  });

  it('isolates workspace B from workspace A imported transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .set('x-workspace-id', workspaceIdB)
      .expect(200);

    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});
