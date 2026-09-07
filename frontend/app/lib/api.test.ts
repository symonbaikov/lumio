import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';

interface MockRequestConfig {
  url?: string;
  headers: Record<string, string>;
  _retry?: boolean;
}

const originalAdapter = apiClient.defaults.adapter;

/**
 * Отдаёт 401 на любой запрос со старым access-токеном и 200 — со свежим.
 * Так же ведёт себя бэкенд после протухания токена.
 */
function installAdapter(): { requests: MockRequestConfig[] } {
  const requests: MockRequestConfig[] = [];
  apiClient.defaults.adapter = (config => {
    const typed = config as unknown as MockRequestConfig;
    requests.push(typed);
    if (typed.headers.Authorization === 'Bearer fresh-access') {
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
    localStorage.setItem('access_token', 'stale-access');
    localStorage.setItem('refresh_token', 'refresh-1');
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' } as Location,
    });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('refreshes once for concurrent 401s and replays every request', async () => {
    installAdapter();
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'fresh-access', refresh_token: 'refresh-2' },
    });

    const results = await Promise.all([
      apiClient.get('/dashboard'),
      apiClient.get('/transactions'),
      apiClient.get('/crypto/wallets'),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[0]).toContain('/auth/refresh');
    expect(results.map(r => r.status)).toEqual([200, 200, 200]);
    expect(localStorage.getItem('access_token')).toBe('fresh-access');
    // Ротация: второй параллельный рефреш предъявил бы уже отозванный refresh-1.
    expect(localStorage.getItem('refresh_token')).toBe('refresh-2');
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
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(window.location.href).toBe('/login');

    // Лока обнулена на ветке ошибки: следующий 401 стартует новый рефреш.
    localStorage.setItem('access_token', 'stale-access');
    localStorage.setItem('refresh_token', 'refresh-3');
    post.mockResolvedValue({ data: { access_token: 'fresh-access' } });

    const response = await apiClient.get('/insights');
    expect(post).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });
});
