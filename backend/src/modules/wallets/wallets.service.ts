import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WorkspaceCrudBaseService } from '../../common/services/workspace-crud-base.service';
import { Wallet } from '../../entities/wallet.entity';
import { WorkspaceCurrencyService } from '../workspaces/workspace-currency.service';
import type { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletsService extends WorkspaceCrudBaseService<Wallet> {
  constructor(
    @InjectRepository(Wallet)
    repository: Repository<Wallet>,
    private readonly workspaceCurrency: WorkspaceCurrencyService,
  ) {
    super(repository, 'Wallet');
  }

  async create(workspaceId: string, userId: string, createDto: CreateWalletDto): Promise<Wallet> {
    // wallets.user_id is NOT NULL: without it every create failed with a 500.
    const wallet = this.repository.create({
      workspaceId,
      userId,
      ...createDto,
      currency: await this.workspaceCurrency.resolveFor(workspaceId, createDto.currency),
      initialBalance: createDto.initialBalance || 0,
      isActive: true,
    });

    return this.repository.save(wallet);
  }
}
