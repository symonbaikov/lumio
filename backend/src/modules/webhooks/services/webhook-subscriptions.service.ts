import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookSubscription,
  WebhookEvent,
} from '../../../entities/webhook-subscription.entity';
import type { CreateWebhookSubscriptionDto } from '../dto/create-webhook-subscription.dto';
import type { UpdateWebhookSubscriptionDto } from '../dto/update-webhook-subscription.dto';

@Injectable()
export class WebhookSubscriptionsService {
  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly repo: Repository<WebhookSubscription>,
  ) {}

  async create(workspaceId: string, dto: CreateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    const entity = this.repo.create({ ...dto, workspaceId });
    return this.repo.save(entity);
  }

  async findAll(workspaceId: string): Promise<WebhookSubscription[]> {
    return this.repo.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string): Promise<WebhookSubscription> {
    const sub = await this.repo.findOne({ where: { id, workspaceId } });
    if (!sub) throw new NotFoundException(`Webhook subscription not found`);
    return sub;
  }

  async update(id: string, workspaceId: string, dto: UpdateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    const sub = await this.findOne(id, workspaceId);
    Object.assign(sub, dto);
    return this.repo.save(sub);
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.findOne(id, workspaceId);
    await this.repo.delete({ id, workspaceId });
  }

  async findActiveByWorkspaceAndEvent(workspaceId: string, event: WebhookEvent): Promise<WebhookSubscription[]> {
    return this.repo
      .createQueryBuilder('sub')
      .where('sub.workspaceId = :workspaceId', { workspaceId })
      .andWhere('sub.isActive = true')
      .andWhere(':event = ANY(sub.events)', { event })
      .getMany();
  }
}
