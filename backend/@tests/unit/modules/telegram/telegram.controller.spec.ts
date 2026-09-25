import { TelegramController } from '@/modules/telegram/telegram.controller';

describe('TelegramController', () => {
  it('parses pagination and returns service result', async () => {
    const telegramService = {
      connectAccount: jest.fn(async (user: any) => ({
        id: user.id,
        telegramId: 't',
        telegramChatId: 'c',
      })),
      listReports: jest.fn(async () => ({ items: [], total: 0 })),
      sendReport: jest.fn(async () => ({ ok: true })),
    };
    const controller = new TelegramController(telegramService as any);

    const connected = await controller.connect({ id: 'u1' } as any, 'ws-open', { token: 'x' } as any);
    expect(connected).toEqual({ userId: 'u1', telegramId: 't', telegramChatId: 'c' });
    // The bot is bound to the workspace open while connecting.
    expect(telegramService.connectAccount).toHaveBeenCalledWith({ id: 'u1' }, 'ws-open', {
      token: 'x',
    });

    const reports = await controller.listReports({ id: 'u1' } as any, '2', '10');
    expect(reports).toEqual({ items: [], total: 0 });
    expect(telegramService.listReports).toHaveBeenCalledWith({ id: 'u1' }, 2, 10);
  });
});
