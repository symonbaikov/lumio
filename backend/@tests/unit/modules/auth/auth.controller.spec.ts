import { AuthController } from '@/modules/auth/auth.controller';

describe('AuthController', () => {
  it('proxies register/login/logout operations', async () => {
    const authService = {
      register: jest.fn(async () => ({ user: { id: 'u1' }, access_token: 'a', refresh_token: 'r' })),
      login: jest.fn(async () => ({ user: { id: 'u1' }, access_token: 'a', refresh_token: 'r' })),
      refreshToken: jest.fn(async () => ({ access_token: 'new', refresh_token: 'r2' })),
      logout: jest.fn(async () => ({ message: 'ok' })),
      logoutAll: jest.fn(async () => ({ message: 'ok-all' })),
      getSessions: jest.fn(async () => [{ id: 's1' }]),
      logoutSession: jest.fn(async () => ({ message: 'ok-session' })),
    };
    const twoFactorService = {
      getStatus: jest.fn(async () => ({
        enabled: false,
        pendingSetup: false,
        recoveryCodesRemaining: 0,
      })),
      setup: jest.fn(async () => ({ secret: 's', otpauthUrl: 'otpauth://', qrDataUrl: 'data:' })),
      enable: jest.fn(async () => ({ recoveryCodes: ['AAAAA-BBBBB'] })),
      disable: jest.fn(async () => undefined),
      regenerateRecoveryCodes: jest.fn(async () => ({ recoveryCodes: ['CCCCC-DDDDD'] })),
    };
    const controller = new AuthController(authService as any, twoFactorService as any);
    const cookies: Record<string, string> = {};
    const res = {
      cookie: jest.fn((name: string, value: string) => {
        cookies[name] = value;
      }),
      clearCookie: jest.fn((name: string) => {
        delete cookies[name];
      }),
    };
    const req = {
      headers: {
        authorization: 'Bearer token',
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '10.0.0.1',
      },
      cookies: {},
      user: { currentSessionId: 's1' },
      ip: '10.0.0.2',
    };

    // Tokens go into httpOnly cookies and must not reach the response body,
    // which is what keeps an XSS from reading them.
    await expect(
      controller.register({ email: 'a@b.com' } as any, req as any, res as any),
    ).resolves.toEqual({ user: { id: 'u1' } });
    expect(cookies.access_token).toBe('a');
    expect(cookies.refresh_token).toBe('r');
    expect(cookies.csrf_token).toEqual(expect.any(String));
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'a',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );

    await expect(
      controller.login({ email: 'a@b.com', password: 'x' } as any, req as any, res as any),
    ).resolves.toEqual({ user: { id: 'u1' } });

    await expect(controller.refresh(req as any, res as any)).resolves.toEqual({
      message: 'Token refreshed',
    });

    await expect(controller.logout({ id: 'u1' } as any, req as any, res as any)).resolves.toEqual({
      message: 'ok',
    });
    expect(cookies.access_token).toBeUndefined();
    expect(cookies.refresh_token).toBeUndefined();

    await expect(controller.logoutAll({ id: 'u1' } as any, res as any)).resolves.toEqual({
      message: 'ok-all',
    });
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

  it('redirects legacy google callback for google sheets integrations', async () => {
    // The redirect target comes from FRONTEND_URL, so the test has to pin it.
    // Reading whatever the machine happens to export made this fail on any
    // setup that does not serve the frontend on :3000 — the dev container
    // serves it on :3002.
    const previousFrontendUrl = process.env.FRONTEND_URL;
    const previousAppUrl = process.env.APP_URL;
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.APP_URL = undefined;

    const authService = {};
    const controller = new AuthController(authService as any, {} as any, {} as any);

    const result = controller.handleGoogleCallback(
      'integrations/google-sheets',
      'code-123',
      undefined,
    );

    expect(result.statusCode).toBe(302);
    expect(result.url).toBe(
      'http://localhost:3000/google-sheets/callback?code=code-123&state=integrations%2Fgoogle-sheets',
    );

    process.env.FRONTEND_URL = previousFrontendUrl;
    process.env.APP_URL = previousAppUrl;
  });
});
