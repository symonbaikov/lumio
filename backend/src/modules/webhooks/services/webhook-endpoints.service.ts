import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { WebhookEndpoint } from '../../../entities/webhook-endpoint.entity';
import type { CreateWebhookEndpointDto } from '../dto/create-webhook-endpoint.dto';
import type { UpdateWebhookEndpointDto } from '../dto/update-webhook-endpoint.dto';

@Injectable()
export class WebhookEndpointsService {
  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly repo: Repository<WebhookEndpoint>,
  ) {}

  async create(workspaceId: string, dto: CreateWebhookEndpointDto): Promise<WebhookEndpoint> {
    const token = randomBytes(32).toString('hex');
    const entity = this.repo.create({ ...dto, workspaceId, isActive: dto.isActive ?? true });
    entity.token = token;
    return this.repo.save(entity);
  }

  async findAll(workspaceId: string): Promise<WebhookEndpoint[]> {
    return this.repo.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string): Promise<WebhookEndpoint> {
    const endpoint = await this.repo.findOne({ where: { id, workspaceId } });
    if (!endpoint) throw new NotFoundException(`Webhook endpoint not found`);
    return endpoint;
  }

  async update(id: string, workspaceId: string, dto: UpdateWebhookEndpointDto): Promise<WebhookEndpoint> {
    const endpoint = await this.findOne(id, workspaceId);
    Object.assign(endpoint, dto);
    return this.repo.save(endpoint);
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.findOne(id, workspaceId);
    await this.repo.delete({ id, workspaceId });
  }

  async findByToken(token: string): Promise<WebhookEndpoint | null> {
    return this.repo.findOne({ where: { token, isActive: true } });
  }
}
