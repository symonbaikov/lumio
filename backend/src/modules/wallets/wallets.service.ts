import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WorkspaceCrudBaseService } from '../../common/services/workspace-crud-base.service';
import { WorkspaceCurrencyService } from '../../common/services/workspace-currency.service';
import { Wallet } from '../../entities/wallet.entity';
import type { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletsService extends WorkspaceCrudBaseService<Wallet> {
  constructor(
    @InjectRepository(Wallet)
    repository: Repository<Wallet>,
    private readonly workspaceCurrencyService: WorkspaceCurrencyService,
  ) {
    super(repository, 'Wallet');
  }

  async create(workspaceId: string, createDto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.repository.create({
      workspaceId,
      ...createDto,
      currency: createDto.currency || (await this.workspaceCurrencyService.resolve(workspaceId)),
      initialBalance: createDto.initialBalance || 0,
      isActive: true,
    });

    return this.repository.save(wallet);
  }
}
