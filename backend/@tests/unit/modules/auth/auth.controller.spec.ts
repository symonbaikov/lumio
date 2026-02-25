import { AuthController } from '@/modules/auth/auth.controller';

describe('AuthController', () => {
  it('proxies register/login/logout operations', async () => {
    const authService = {
      register: jest.fn(async () => ({ access_token: 'a', refresh_token: 'r' })),
      login: jest.fn(async () => ({ access_token: 'a', refresh_token: 'r' })),
      loginWithGoogle: jest.fn(async () => ({ access_token: 'a', refresh_token: 'r' })),
      refreshToken: jest.fn(async () => ({ access_token: 'new' })),
      logout: jest.fn(async () => ({ message: 'ok' })),
      logoutAll: jest.fn(async () => ({ message: 'ok-all' })),
      getSessions: jest.fn(async () => [{ id: 's1' }]),
      logoutSession: jest.fn(async () => ({ message: 'ok-session' })),
    };
    const controller = new AuthController(authService as any);
    const req = {
      headers: {
        authorization: 'Bearer token',
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '10.0.0.1',
      },
      user: { currentSessionId: 's1' },
      ip: '10.0.0.2',
    };

    await expect(controller.register({ email: 'a@b.com' } as any, req)).resolves.toMatchObject({
      access_token: 'a',
    });
    await expect(
      controller.login({ email: 'a@b.com', password: 'x' } as any, req),
    ).resolves.toMatchObject({
      refresh_token: 'r',
    });
    await expect(
      controller.loginWithGoogle({ credential: 'google' } as any, req),
    ).resolves.toMatchObject({
      refresh_token: 'r',
    });
    await expect(controller.refresh(req as any)).resolves.toEqual({ access_token: 'new' });
    await expect(controller.logout({ id: 'u1' } as any, req)).resolves.toEqual({ message: 'ok' });
    await expect(controller.logoutAll({ id: 'u1' } as any)).resolves.toEqual({ message: 'ok-all' });
    await expect(controller.getSessions({ id: 'u1' } as any, req)).resolves.toEqual([{ id: 's1' }]);
    await expect(controller.logoutSession({ id: 'u1' } as any, 's1')).resolves.toEqual({
      message: 'ok-session',
    });
    await expect(controller.getProfile({ id: 'u1', email: 'a@b.com' } as any)).resolves.toEqual({
      id: 'u1',
      email: 'a@b.com',
    });

    expect(authService.logout).toHaveBeenCalledWith('u1', 's1');
    expect(authService.getSessions).toHaveBeenCalledWith('u1', 's1');
  });
});
