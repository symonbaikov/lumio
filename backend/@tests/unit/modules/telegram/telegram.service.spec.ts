import { InsightCategory, InsightSeverity, InsightType } from '@/entities/insight.entity';
import { ReportStatus } from '@/entities/telegram-report.entity';
import type { User } from '@/entities/user.entity';
import { TelegramService } from '@/modules/telegram/telegram.service';

function createConfigMock() {
  return { get: jest.fn().mockReturnValue('test-bot-token') } as any;
}

function createUserRepoMock(users: Partial<User>[] = []) {
  const queryBuilder: any = {
    where: jest.fn(() => queryBuilder),
    andWhere: jest.fn(() => queryBuilder),
    getOne: jest.fn(async () => users[0] ?? null),
  };
  return {
    merge: jest.fn((user: any, patch: any) => ({ ...user, ...patch })),
    save: jest.fn(async (user: any) => user),
    createQueryBuilder: jest.fn(() => queryBuilder),
    findOne: jest.fn(async () => null),
  } as any;
}

function createReportRepoMock() {
  return {
    findAndCount: jest.fn(async () => [[], 0]),
    create: jest.fn((data: any) => ({ ...data, status: ReportStatus.PENDING })),
    save: jest.fn(async (data: any) => data),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
    })),
  } as any;
}

function createGoalsServiceMock(goals: unknown[] = []) {
  return { findAll: jest.fn(async () => goals) } as any;
}

function createNetWorthServiceMock(netWorth: unknown) {
  return { getNetWorth: jest.fn(async () => netWorth) } as any;
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    workspaceId: 'workspace-1',
    telegramId: 'tg-1',
    telegramChatId: 'chat-1',
    locale: 'ru',
    ...overrides,
  } as User;
}

function baseNetWorth(overrides: Record<string, unknown> = {}) {
  return {
    range: '30d',
    currency: 'KZT',
    current: 1000,
    previous: 900,
    change: 100,
    changePercent: 11.11,
    assetsTotal: 1000,
    liabilitiesTotal: 0,
    series: [],
    breakdown: [],
    byRisk: [],
    byRole: [],
    riskyPercent: 0,
    assetLines: [],
    ...overrides,
  };
}

function createService(options: {
  users?: Partial<User>[];
  goals?: unknown[];
  netWorth?: unknown;
} = {}) {
  const userRepository = createUserRepoMock(options.users ?? []);
  const telegramReportRepository = createReportRepoMock();
  const goalsService = createGoalsServiceMock(options.goals);
  const netWorthService = createNetWorthServiceMock(options.netWorth ?? baseNetWorth());
  const reportsService = {
    generateDailyReport: jest.fn(),
    generateMonthlyReport: jest.fn(),
  } as any;
  const statementsService = { create: jest.fn() } as any;

  const service = new TelegramService(
    createConfigMock(),
    userRepository,
    telegramReportRepository,
    reportsService,
    statementsService,
    goalsService,
    netWorthService,
  );

  return { service, userRepository, telegramReportRepository, goalsService, netWorthService };
}

/** Captures every `sendMessage` payload the service posts to Telegram. */
function mockFetchOk() {
  const calls: Array<{ chat_id: string; text: string }> = [];
  global.fetch = jest.fn(async (_url: unknown, init: any) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    };
  }) as any;
  return calls;
}

describe('TelegramService locale resolution', () => {
  it('renders the connect confirmation in the connecting user’s locale', async () => {
    const calls = mockFetchOk();
    const { service } = createService();

    await service.connectAccount(user({ locale: 'en' }), { chatId: 'chat-1' });

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('Telegram connected');
  });

  it('greets a known user with /start in their stored locale, not the client language', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [user({ locale: 'es', telegramId: 'tg-9' })] });

    await service.handleUpdate({
      message: {
        chat: { id: 'chat-1' },
        text: '/start',
        from: { id: 'tg-9', language_code: 'de' },
      },
    });

    expect(calls[0].text).toContain('¡Hola!');
  });

  it('falls back to Telegram’s client language for an unmatched /start', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [] });

    await service.handleUpdate({
      message: {
        chat: { id: 'chat-1' },
        text: '/start',
        from: { id: 'tg-unknown', language_code: 'de' },
      },
    });

    expect(calls[0].text).toContain('Hallo!');
  });

  it('falls back to Russian when Telegram reports an unsupported client language', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [] });

    await service.handleUpdate({
      message: {
        chat: { id: 'chat-1' },
        text: '/start',
        from: { id: 'tg-unknown', language_code: 'xx' },
      },
    });

    expect(calls[0].text).toContain('Привет!');
  });

  it('renders /help and the unknown-command reply in the resolved locale', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [user({ locale: 'en', telegramId: 'tg-9' })] });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/help', from: { id: 'tg-9' } },
    });
    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/nonsense', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toContain('/goals — progress on your savings goals');
    expect(calls[1].text).toBe('Unknown command. Use /help to see the list of commands.');
  });
});

describe('TelegramService /goals', () => {
  it('reports an empty state when the workspace has no goals', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [user({ locale: 'en', telegramId: 'tg-9' })], goals: [] });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/goals', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toBe('No goals yet. Create one in the Lumio web app.');
  });

  it('lists each goal with its progress', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      goals: [
        { name: 'Emergency fund', currentAmount: 5000, targetAmount: 10000, currency: 'KZT', percent: 50 },
      ],
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/goals', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toContain('Savings goals');
    expect(calls[0].text).toContain('Emergency fund: 5,000.00 / 10,000.00 KZT (50%)');
  });

  it('tells an unconnected chat to link their account first', async () => {
    const calls = mockFetchOk();
    const { service } = createService({ users: [] });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/goals', from: { id: 'tg-unknown', language_code: 'en' } },
    });

    expect(calls[0].text).toContain('No account is connected to Telegram ID tg-unknown');
  });
});

describe('TelegramService /networth', () => {
  it('shows an upward change', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      netWorth: baseNetWorth({ current: 1100, change: 100, changePercent: 10 }),
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/networth', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toContain('Net worth: 1,100.00 KZT');
    expect(calls[0].text).toContain('▲ +100.00 KZT (+10%) over the period');
  });

  it('shows a downward change', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      netWorth: baseNetWorth({ current: 800, change: -100, changePercent: -11.11 }),
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/networth', from: { id: 'tg-9' } },
    });

    // The ▼ marker already conveys direction, so the percent alongside it is
    // shown as a magnitude, not doubled up with its own minus sign.
    expect(calls[0].text).toContain('▼ 100.00 KZT (11.11%) over the period');
  });

  it('omits the percentage line when there was nothing to compare against', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      netWorth: baseNetWorth({ previous: 0, change: 500, changePercent: null }),
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/networth', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toContain('Change over the period: 500.00 KZT');
  });

  it('appends the 80/20 risk warning past the threshold', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      netWorth: baseNetWorth({ riskyPercent: 35 }),
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/networth', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).toContain('35% of assets are at medium/high risk — above the 20% threshold');
  });

  it('stays quiet about risk when the allocation is within the rule', async () => {
    const calls = mockFetchOk();
    const { service } = createService({
      users: [user({ locale: 'en', telegramId: 'tg-9' })],
      netWorth: baseNetWorth({ riskyPercent: 10 }),
    });

    await service.handleUpdate({
      message: { chat: { id: 'chat-1' }, text: '/networth', from: { id: 'tg-9' } },
    });

    expect(calls[0].text).not.toContain('medium/high risk');
  });
});

describe('TelegramService.pushInsightDigest', () => {
  it('sends one message per insight, prefixed with the digest header', async () => {
    const calls = mockFetchOk();
    const { service } = createService();

    await service.pushInsightDigest(user({ locale: 'en' }), [
      {
        type: InsightType.RISKY_ALLOCATION,
        category: InsightCategory.PATTERN,
        severity: InsightSeverity.WARN,
        title: 'Too much capital at risk',
        message: '35% of assets sit in medium or high risk — above the 20% limit',
      } as any,
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('New Lumio alert');
    expect(calls[0].text).toContain('Too much capital at risk');
  });

  it('does nothing when the recipient has no connected chat', async () => {
    const calls = mockFetchOk();
    const { service } = createService();

    await service.pushInsightDigest(user({ telegramChatId: undefined as unknown as string }), [
      { title: 'x', message: 'y', severity: InsightSeverity.WARN } as any,
    ]);

    expect(calls).toHaveLength(0);
  });
});
