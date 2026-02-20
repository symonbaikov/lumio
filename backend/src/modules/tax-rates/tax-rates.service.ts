import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TaxRate } from '../../entities/tax-rate.entity';
import type { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import type { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@Injectable()
export class TaxRatesService {
  constructor(
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
  ) {}

  async findAll(workspaceId: string): Promise<TaxRate[]> {
    return this.taxRateRepository.find({
      where: { workspaceId },
      order: {
        isDefault: 'DESC',
        rate: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<TaxRate> {
    const taxRate = await this.taxRateRepository.findOne({
      where: { id, workspaceId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return taxRate;
  }

  async create(workspaceId: string, createDto: CreateTaxRateDto): Promise<TaxRate> {
    const name = createDto.name.trim();
    if (!name) {
      throw new BadRequestException('Tax rate name is required');
    }

    const duplicate = await this.taxRateRepository.findOne({
      where: { workspaceId, name },
    });

    if (duplicate) {
      throw new BadRequestException('Tax rate with this name already exists');
    }

    const shouldBeDefault = createDto.isDefault === true;
    if (shouldBeDefault) {
      await this.taxRateRepository.update({ workspaceId, isDefault: true }, { isDefault: false });
    }

    const taxRate = this.taxRateRepository.create({
      workspaceId,
      name,
      rate: createDto.rate,
      isDefault: shouldBeDefault,
      isEnabled: createDto.isEnabled ?? true,
    });

    return this.taxRateRepository.save(taxRate);
  }

  async update(id: string, workspaceId: string, updateDto: UpdateTaxRateDto): Promise<TaxRate> {
    const taxRate = await this.findOne(id, workspaceId);

    if (updateDto.name !== undefined) {
      const normalizedName = updateDto.name.trim();
      if (!normalizedName) {
        throw new BadRequestException('Tax rate name is required');
      }

      const duplicate = await this.taxRateRepository.findOne({
        where: { workspaceId, name: normalizedName },
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
        await this.taxRateRepository.update({ workspaceId, isDefault: true }, { isDefault: false });
      }
      taxRate.isDefault = updateDto.isDefault;
    }

    return this.taxRateRepository.save(taxRate);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const taxRate = await this.findOne(id, workspaceId);
    await this.taxRateRepository.remove(taxRate);
  }

  async createDefaultTaxRates(workspaceId: string): Promise<void> {
    const existingCount = await this.taxRateRepository.count({ where: { workspaceId } });
    if (existingCount > 0) {
      return;
    }

    const defaultRate = this.taxRateRepository.create({
      workspaceId,
      name: 'Tax exempt (0%)',
      rate: 0,
      isDefault: true,
      isEnabled: true,
    });

    await this.taxRateRepository.save(defaultRate);
  }
}
