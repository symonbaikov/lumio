import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsOrder } from 'typeorm';
import { Repository } from 'typeorm';
import { WorkspaceCrudBaseService } from '../../common/services/workspace-crud-base.service';
import { TaxRate } from '../../entities/tax-rate.entity';
import { TaxRule, TaxRuleDirection } from '../../entities/tax-rule.entity';
import type { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import type { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';

@Injectable()
export class TaxRulesService extends WorkspaceCrudBaseService<TaxRule> {
  constructor(
    @InjectRepository(TaxRule)
    repository: Repository<TaxRule>,
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
  ) {
    super(repository, 'Tax rule');
  }

  protected getDefaultOrder(): FindOptionsOrder<TaxRule> {
    return { priority: 'DESC', createdAt: 'ASC' };
  }

  /**
   * A rule may only name a code the workspace actually holds.
   *
   * Without this a typo produces a rule that silently never matches, and the
   * transactions it was meant to cover quietly fall through to the default
   * rate instead.
   */
  private async assertCodeExists(workspaceId: string, code: string): Promise<void> {
    const exists = await this.taxRateRepository.findOne({
      where: { workspaceId, code } as any,
    });

    if (!exists) {
      throw new BadRequestException(
        `No tax rate with code '${code}' in this workspace. Pick a country first, or use a code from GET /tax/settings/rates.`,
      );
    }
  }

  async create(workspaceId: string, dto: CreateTaxRuleDto): Promise<TaxRule> {
    const code = dto.taxRateCode.trim();
    await this.assertCodeExists(workspaceId, code);

    const direction = dto.direction ?? TaxRuleDirection.BOTH;
    const categoryId = dto.categoryId ?? null;

    const duplicate = await this.repository.findOne({
      where: { workspaceId, categoryId, direction } as any,
    });

    if (duplicate) {
      throw new BadRequestException(
        'A rule for this category and direction already exists. Edit it instead.',
      );
    }

    return this.repository.save(
      this.repository.create({
        workspaceId,
        categoryId,
        taxRateCode: code,
        priority: dto.priority ?? 0,
        direction,
        isEnabled: dto.isEnabled ?? true,
      }),
    );
  }

  async update(id: string, workspaceId: string, dto: UpdateTaxRuleDto): Promise<TaxRule> {
    const rule = await this.findOne(id, workspaceId);

    if (dto.taxRateCode !== undefined) {
      const code = dto.taxRateCode.trim();
      await this.assertCodeExists(workspaceId, code);
      rule.taxRateCode = code;
    }

    if (dto.priority !== undefined) {
      rule.priority = dto.priority;
    }

    if (dto.isEnabled !== undefined) {
      rule.isEnabled = dto.isEnabled;
    }

    // Category and direction together form the rule's identity, so changing
    // either has to re-check for a clash with an existing rule.
    const nextCategoryId =
      dto.categoryId !== undefined ? (dto.categoryId ?? null) : rule.categoryId;
    const nextDirection = dto.direction ?? rule.direction;

    if (nextCategoryId !== rule.categoryId || nextDirection !== rule.direction) {
      const clash = await this.repository.findOne({
        where: { workspaceId, categoryId: nextCategoryId, direction: nextDirection } as any,
      });

      if (clash && clash.id !== id) {
        throw new BadRequestException(
          'A rule for this category and direction already exists. Edit it instead.',
        );
      }

      rule.categoryId = nextCategoryId;
      rule.direction = nextDirection;
    }

    return this.repository.save(rule);
  }
}
