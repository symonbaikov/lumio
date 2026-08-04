import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Workspace } from '../../entities/workspace.entity';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../constants/currency.constants';

/**
 * Resolves the display currency configured for a workspace.
 *
 * Provided by the global `CommonModule`, so it can be injected anywhere without
 * importing an extra module.
 */
@Injectable()
export class WorkspaceCurrencyService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async resolve(workspaceId: string | null | undefined): Promise<string> {
    if (!workspaceId) {
      return DEFAULT_CURRENCY;
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });

    return normalizeCurrency(workspace?.currency);
  }
}
