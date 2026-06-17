import { MetricsController } from '@/modules/observability/metrics.controller';
import { ForbiddenException } from '@nestjs/common';

describe('MetricsController', () => {
  const metricsService = {
    contentType: jest.fn(() => 'text/plain'),
    metrics: jest.fn(async () => 'ok'),
  };

  afterEach(() => {
    process.env.METRICS_AUTH_TOKEN = '';
    process.env.NODE_ENV = 'test';
  });

  it('rejects when METRICS_AUTH_TOKEN is set and header mismatches', async () => {
    process.env.METRICS_AUTH_TOKEN = 'secret';
    const controller = new MetricsController(metricsService as any);
    await expect(controller.getMetrics({} as any, 'Bearer wrong')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns metrics when token is absent outside production', async () => {
    process.env.METRICS_AUTH_TOKEN = '';
    process.env.NODE_ENV = 'test';
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    const controller = new MetricsController(metricsService as any);

    await controller.getMetrics(res, undefined);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('rejects in production when METRICS_AUTH_TOKEN is unset', async () => {
    process.env.METRICS_AUTH_TOKEN = '';
    process.env.NODE_ENV = 'production';
    const controller = new MetricsController(metricsService as any);

    await expect(controller.getMetrics({} as any, undefined)).rejects.toThrow(ForbiddenException);
  });
});
