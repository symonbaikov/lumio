import { UnauthorizedException } from '@nestjs/common';
import { WebhookTokenGuard } from '../../../../src/modules/webhooks/guards/webhook-token.guard';

describe('WebhookTokenGuard', () => {
  let guard: WebhookTokenGuard;
  const mockEndpointsService = { findByToken: jest.fn() };

  beforeEach(() => {
    guard = new WebhookTokenGuard(mockEndpointsService as any);
    jest.clearAllMocks();
  });

  it('should allow valid active token', async () => {
    const endpoint = { id: 'ep-1', isActive: true };
    mockEndpointsService.findByToken.mockResolvedValue(endpoint);
    const req: any = { params: { token: 'validtoken' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.webhookEndpoint).toBe(endpoint);
  });

  it('should throw for missing token', async () => {
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ params: {} }) }) };
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw for unknown token', async () => {
    mockEndpointsService.findByToken.mockResolvedValue(null);
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ params: { token: 'bad' } }) }) };
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
