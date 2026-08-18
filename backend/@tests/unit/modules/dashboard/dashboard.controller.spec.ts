import { DashboardController } from '@/modules/dashboard/dashboard.controller';

describe('DashboardController', () => {
  it('uses active workspace id from guard for dashboard data', async () => {
    const dashboardService = {
      getDashboard: jest.fn(async () => ({ ok: true })),
      getTrends: jest.fn(async () => ({ ok: true })),
    };
    const controller = new DashboardController(dashboardService as any);
    const user = { id: 'user-1', workspaceId: 'default-workspace' } as any;
    const activeWorkspaceId = 'active-workspace';

    const result = await controller.getDashboard(user, activeWorkspaceId, '30d');

    expect(result).toEqual({ ok: true });
    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      'user-1',
      activeWorkspaceId,
      '30d',
      undefined,
    );
  });

  it('accepts range=month and passes it through unchanged', async () => {
    const dashboardService = {
      getDashboard: jest.fn(async () => ({ ok: true })),
      getTrends: jest.fn(async () => ({ ok: true })),
    };
    const controller = new DashboardController(dashboardService as any);
    const user = { id: 'user-1', workspaceId: 'default-workspace' } as any;
    const activeWorkspaceId = 'active-workspace';

    await controller.getDashboard(user, activeWorkspaceId, 'month' as any, '2026-03-01');

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      'user-1',
      activeWorkspaceId,
      'month',
      '2026-03-01',
    );
  });

  it('falls back to 30d for an unrecognized range value', async () => {
    const dashboardService = {
      getDashboard: jest.fn(async () => ({ ok: true })),
      getTrends: jest.fn(async () => ({ ok: true })),
    };
    const controller = new DashboardController(dashboardService as any);
    const user = { id: 'user-1', workspaceId: 'default-workspace' } as any;
    const activeWorkspaceId = 'active-workspace';

    await controller.getDashboard(user, activeWorkspaceId, 'bogus' as any);

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      'user-1',
      activeWorkspaceId,
      '30d',
      undefined,
    );
  });

  it('uses active workspace id from guard for dashboard trends', async () => {
    const dashboardService = {
      getDashboard: jest.fn(async () => ({ ok: true })),
      getTrends: jest.fn(async () => ({ ok: true })),
    };
    const controller = new DashboardController(dashboardService as any);
    const user = { id: 'user-1', workspaceId: 'default-workspace' } as any;
    const activeWorkspaceId = 'active-workspace';

    const result = await controller.getTrends(user, activeWorkspaceId, 30);

    expect(result).toEqual({ ok: true });
    expect(dashboardService.getTrends).toHaveBeenCalledWith(activeWorkspaceId, 30);
  });
});
