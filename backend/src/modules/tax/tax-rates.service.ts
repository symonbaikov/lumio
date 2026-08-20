import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsOrder, Repository } from 'typeorm';
import { WorkspaceCrudBaseService } from '../../common/services/workspace-crud-base.service';
import { TaxRate } from '../../entities/tax-rate.entity';
import type { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import type { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@Injectable()
export class TaxRatesService extends WorkspaceCrudBaseService<TaxRate> {
  constructor(
    @InjectRepository(TaxRate)
    repository: Repository<TaxRate>,
  ) {
    super(repository, 'Tax rate');
  }

  protected getDefaultOrder(): FindOptionsOrder<TaxRate> {
    return { isDefault: 'DESC', rate: 'ASC', name: 'ASC' };
  }

  async create(workspaceId: string, createDto: CreateTaxRateDto): Promise<TaxRate> {
    const name = createDto.name.trim();
    if (!name) {
      throw new BadRequestException('Tax rate name is required');
    }

    const duplicate = await this.repository.findOne({
      where: { workspaceId, name } as any,
    });

    if (duplicate) {
      throw new BadRequestException('Tax rate with this name already exists');
    }

    const shouldBeDefault = createDto.isDefault === true;
    if (shouldBeDefault) {
      await this.repository.update({ workspaceId, isDefault: true } as any, { isDefault: false });
    }

    const taxRate = this.repository.create({
      workspaceId,
      name,
      rate: createDto.rate,
      isDefault: shouldBeDefault,
      isEnabled: createDto.isEnabled ?? true,
    });

    return this.repository.save(taxRate);
  }

  async update(id: string, workspaceId: string, updateDto: UpdateTaxRateDto): Promise<TaxRate> {
    const taxRate = await this.findOne(id, workspaceId);

    if (updateDto.name !== undefined) {
      const normalizedName = updateDto.name.trim();
      if (!normalizedName) {
        throw new BadRequestException('Tax rate name is required');
      }

      const duplicate = await this.repository.findOne({
        where: { workspaceId, name: normalizedName } as any,
      });

      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException('Tax rate with this name already exists');
      }

      taxRate.name = normalizedName;
    }

    if (updateDto.rate !== undefined) {
      taxRate.rate = updateDto.rate;
    }

    if (updateDto.isEnabled !== undefined) {
      taxRate.isEnabled = updateDto.isEnabled;
    }

    if (updateDto.isDefault !== undefined) {
      if (updateDto.isDefault) {
        await this.repository.update({ workspaceId, isDefault: true } as any, { isDefault: false });
      }
      taxRate.isDefault = updateDto.isDefault;
    }

    return this.repository.save(taxRate);
  }

  async createDefaultTaxRates(workspaceId: string): Promise<void> {
    const existingCount = await this.repository.count({ where: { workspaceId } as any });
    if (existingCount > 0) {
      return;
    }

    const defaultRate = this.repository.create({
      workspaceId,
      name: 'Tax exempt (0%)',
      rate: 0,
      isDefault: true,
      isEnabled: true,
    });

    await this.repository.save(defaultRate);
  }
}
