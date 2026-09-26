import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsOrder, Repository } from 'typeorm';
import { WorkspaceCrudBaseService } from '../../common/services/workspace-crud-base.service';
import { Client } from '../../entities/client.entity';
import type { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService extends WorkspaceCrudBaseService<Client> {
  constructor(
    @InjectRepository(Client)
    repository: Repository<Client>,
  ) {
    super(repository, 'Client');
  }

  protected getDefaultOrder(): FindOptionsOrder<Client> {
    return { name: 'ASC' };
  }

  async create(workspaceId: string, dto: CreateClientDto): Promise<Client> {
    const client = this.repository.create({
      workspaceId,
      name: dto.name.trim(),
      email: dto.email || null,
      billingAddress: dto.billingAddress || null,
      taxId: dto.taxId || null,
      currency: dto.currency || 'KZT',
    });
    return this.repository.save(client);
  }
}
