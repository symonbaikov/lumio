import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';

interface MockRequestConfig {
  url?: string;
  headers: Record<string, string>;
  _retry?: boolean;
}

const originalAdapter = apiClient.defaults.adapter;

const setCsrfCookie = (value: string): void => {
  document.cookie = `csrf_token=${value}`;
};

const clearCookies = (): void => {
  for (const part of document.cookie.split('; ')) {
    const name = part.split('=')[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

/**
 * Отдаёт 401 на запрос со старым CSRF-токеном и 200 — со свежим. Токены живут в
 * httpOnly-куках, которые тест прочитать не может, поэтому ротация сессии здесь
 * наблюдается через парную csrf-куку — ровно как её видит и сам клиент.
 */
function installAdapter(): { requests: MockRequestConfig[] } {
  const requests: MockRequestConfig[] = [];
  apiClient.defaults.adapter = (config => {
    const typed = config as unknown as MockRequestConfig;
    requests.push(typed);
    if (typed.headers['X-CSRF-Token'] === 'fresh-csrf') {
      return Promise.resolve({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }
    return Promise.reject({ config, response: { status: 401 }, isAxiosError: true });
  }) as typeof apiClient.defaults.adapter;
  return { requests };
}

describe('api single-flight refresh', () => {
  beforeEach(() => {
    setCsrfCookie('stale-csrf');
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' } as Location,
    });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    clearCookies();
    localStorage.clear();
    Reflect.deleteProperty(navigator, 'locks');
    vi.restoreAllMocks();
  });

  it('refreshes once for concurrent 401s and replays every request', async () => {
    const { requests } = installAdapter();
    const post = vi.spyOn(axios, 'post').mockImplementation(async () => {
      // Бэкенд перезаписывает куки в ответе на /auth/refresh.
      setCsrfCookie('fresh-csrf');
      return { data: { message: 'Token refreshed' } };
    });

    const results = await Promise.all([
      apiClient.get('/dashboard'),
      apiClient.get('/transactions'),
      apiClient.get('/crypto/wallets'),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[0]).toContain('/auth/refresh');
    expect(results.map(r => r.status)).toEqual([200, 200, 200]);

    // Повтор должен перечитать ротированный CSRF-токен, а не переиспользовать старый.
    // axios переиспользует тот же объект config, поэтому считаем не элементы, а
    // отмеченные ретраем запросы — у всех должен стоять свежий заголовок.
    const retried = requests.filter(request => request._retry);
    expect(retried.length).toBeGreaterThan(0);
    expect(retried.every(request => request.headers['X-CSRF-Token'] === 'fresh-csrf')).toBe(true);
  });

  it('никогда не кладёт токены в localStorage', async () => {
    installAdapter();
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      setCsrfCookie('fresh-csrf');
      return { data: { message: 'Token refreshed' } };
    });

    await apiClient.get('/dashboard');

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  // Tabs share the refresh cookie; refreshing inside a Web Lock keeps two tabs
  // from presenting the same rotated token at once.
  it('refreshes inside a cross-tab Web Lock', async () => {
    installAdapter();
    const order: string[] = [];
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      order.push('lock');
      const result = await callback();
      order.push('unlock');
      return result;
    });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      order.push('refresh');
      setCsrfCookie('fresh-csrf');
      return { data: { message: 'Token refreshed' } };
    });

    const response = await apiClient.get('/dashboard');

    expect(request).toHaveBeenCalledWith('lumio-auth-refresh', expect.any(Function));
    expect(order).toEqual(['lock', 'refresh', 'unlock']);
    expect(response.status).toBe(200);
  });

  it('clears the in-flight lock when the refresh fails, so a later 401 retries', async () => {
    installAdapter();
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh rejected'));

    const settled = await Promise.allSettled([
      apiClient.get('/dashboard'),
      apiClient.get('/transactions'),
      apiClient.get('/crypto/wallets'),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(settled.every(r => r.status === 'rejected')).toBe(true);
    expect(localStorage.getItem('currentWorkspaceId')).toBeNull();
    expect(window.location.href).toBe('/login');

    // Лока обнулена на ветке ошибки: следующий 401 стартует новый рефреш.
    post.mockImplementation(async () => {
      setCsrfCookie('fresh-csrf');
      return { data: { message: 'Token refreshed' } };
    });

    const response = await apiClient.get('/insights');
    expect(post).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });
});
