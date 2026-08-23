import { PayableDirection, PayableStatus } from '@/entities/payable.entity';
import { PayablesScheduler } from '@/modules/payables/payables.scheduler';

describe('PayablesScheduler', () => {
  it('notifies due-soon payables once and marks them notified', async () => {
    const payablesService = {
      markOverduePayables: jest.fn(async () => []),
      findDueSoonPayables: jest.fn(async () => [
        {
          id: 'payable-1',
          workspaceId: 'workspace-1',
          vendor: 'Acme',
          direction: PayableDirection.PAYABLE,
          status: PayableStatus.TO_PAY,
          dueSoonNotifiedAt: null,
        },
      ]),
      markDueSoonNotified: jest.fn(async () => undefined),
    };
    const notificationsService = {
      createForWorkspaceMembers: jest.fn(async () => 1),
    };

    const scheduler = new PayablesScheduler(payablesService as any, notificationsService as any);

    await scheduler.processDailyPayables();

    expect(notificationsService.createForWorkspaceMembers).toHaveBeenCalledTimes(1);
    expect(payablesService.markDueSoonNotified).toHaveBeenCalledWith('payable-1');
  });

  it('continues processing remaining items when one notification fails', async () => {
    const payablesService = {
      markOverduePayables: jest.fn(async () => [
        {
          id: 'overdue-1',
          workspaceId: 'workspace-1',
          vendor: 'A',
          direction: PayableDirection.PAYABLE,
        },
        {
          id: 'overdue-2',
          workspaceId: 'workspace-1',
          vendor: 'B',
          direction: PayableDirection.PAYABLE,
        },
      ]),
      findDueSoonPayables: jest.fn(async () => [
        { id: 'due-1', workspaceId: 'workspace-1', vendor: 'C' },
        { id: 'due-2', workspaceId: 'workspace-1', vendor: 'D' },
      ]),
      markDueSoonNotified: jest.fn(async () => undefined),
    };
    const notificationsService = {
      createForWorkspaceMembers: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('boom-2'))
        .mockResolvedValueOnce(1),
    };

    const scheduler = new PayablesScheduler(payablesService as any, notificationsService as any);

    await expect(scheduler.processDailyPayables()).resolves.not.toThrow();

    expect(notificationsService.createForWorkspaceMembers).toHaveBeenCalledTimes(4);
    expect(payablesService.markDueSoonNotified).toHaveBeenCalledTimes(1);
    expect(payablesService.markDueSoonNotified).toHaveBeenCalledWith('due-2');
  });
  it('does not send payable-worded overdue notifications for receivables', async () => {
    const payablesService = {
      markOverduePayables: jest.fn(async () => [
        {
          id: 'overdue-1',
          workspaceId: 'workspace-1',
          vendor: 'Owes us',
          direction: PayableDirection.RECEIVABLE,
        },
      ]),
      findDueSoonPayables: jest.fn(async () => []),
      markDueSoonNotified: jest.fn(async () => undefined),
    };
    const notificationsService = {
      createForWorkspaceMembers: jest.fn(async () => 1),
    };

    const scheduler = new PayablesScheduler(payablesService as any, notificationsService as any);

    await scheduler.processDailyPayables();

    expect(notificationsService.createForWorkspaceMembers).not.toHaveBeenCalled();
  });
});
