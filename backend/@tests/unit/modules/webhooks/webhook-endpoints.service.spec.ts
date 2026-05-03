import { NotFoundException } from '@nestjs/common';
import { WebhookEndpointsService } from '../../../../src/modules/webhooks/services/webhook-endpoints.service';

describe('WebhookEndpointsService', () => {
  let service: WebhookEndpointsService;
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    service = new WebhookEndpointsService(mockRepo as any);
    jest.clearAllMocks();
  });

  it('should generate a 64-char hex token on create', async () => {
    const dto = { name: 'n8n upload' };
    mockRepo.create.mockReturnValue({ ...dto, token: '' });
    mockRepo.save.mockImplementation(async (e: any) => e);

    const result = await service.create('ws-1', dto);

    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should throw NotFoundException for wrong workspace', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('id-1', 'ws-wrong')).rejects.toThrow(NotFoundException);
  });
});
