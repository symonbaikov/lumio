import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { assertFound } from '../../common/utils/assert-found.util';
import { Goal, GoalContribution } from '../../entities';
import type { CreateContributionDto } from './dto/create-contribution.dto';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';

export interface GoalWithProgress {
  id: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate: string | null;
  currentAmount: number;
  remaining: number;
  percent: number;
  isReached: boolean;
  createdAt: Date;
}

export interface GoalDetail extends GoalWithProgress {
  contributions: Array<{
    id: string;
    amount: number;
    contributionDate: string;
    note: string | null;
    createdAt: Date;
  }>;
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(GoalContribution)
    private readonly contributionRepository: Repository<GoalContribution>,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateGoalDto): Promise<GoalWithProgress> {
    const goal = this.goalRepository.create({
      workspaceId,
      createdById: userId,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currency: dto.currency || 'KZT',
      targetDate: dto.targetDate ?? null,
    });

    const saved = await this.goalRepository.save(goal);
    return toProgress(saved, 0);
  }

  async findAll(workspaceId: string): Promise<GoalWithProgress[]> {
    const goals = await this.goalRepository.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });

    if (goals.length === 0) {
      return [];
    }

    const totals = await this.sumContributions(
      workspaceId,
      goals.map(goal => goal.id),
    );

    return goals.map(goal => toProgress(goal, totals.get(goal.id) ?? 0));
  }

  async findOne(id: string, workspaceId: string): Promise<GoalDetail> {
    const goal = await this.goalRepository.findOne({ where: { id, workspaceId } });
    assertFound(goal, 'Goal');

    const contributions = await this.contributionRepository.find({
      where: { goalId: goal.id, workspaceId },
      order: { contributionDate: 'DESC', createdAt: 'DESC' },
    });

    const currentAmount = contributions.reduce(
      (sum, contribution) => sum + toNumber(contribution.amount),
      0,
    );

    return {
      ...toProgress(goal, currentAmount),
      contributions: contributions.map(contribution => ({
        id: contribution.id,
        amount: toNumber(contribution.amount),
        contributionDate: contribution.contributionDate,
        note: contribution.note,
        createdAt: contribution.createdAt,
      })),
    };
  }

  async update(id: string, workspaceId: string, dto: UpdateGoalDto): Promise<GoalWithProgress> {
    const goal = await this.goalRepository.findOne({ where: { id, workspaceId } });
    assertFound(goal, 'Goal');

    if (dto.name !== undefined) {
      goal.name = dto.name;
    }
    if (dto.targetAmount !== undefined) {
      goal.targetAmount = dto.targetAmount;
    }
    if (dto.currency !== undefined) {
      goal.currency = dto.currency;
    }
    if (dto.targetDate !== undefined) {
      goal.targetDate = dto.targetDate;
    }

    await this.goalRepository.save(goal);
    const totals = await this.sumContributions(workspaceId, [goal.id]);
    return toProgress(goal, totals.get(goal.id) ?? 0);
  }

  /**
   * Soft delete: the contribution history is a record of real money set
   * aside, so removing a goal hides it rather than erasing what happened.
   */
  async remove(id: string, workspaceId: string): Promise<void> {
    const goal = await this.goalRepository.findOne({ where: { id, workspaceId } });
    assertFound(goal, 'Goal');
    await this.goalRepository.softRemove(goal);
  }

  async addContribution(
    id: string,
    workspaceId: string,
    userId: string,
    dto: CreateContributionDto,
  ): Promise<GoalDetail> {
    const goal = await this.goalRepository.findOne({ where: { id, workspaceId } });
    assertFound(goal, 'Goal');

    const contribution = this.contributionRepository.create({
      goalId: goal.id,
      workspaceId,
      createdById: userId,
      amount: dto.amount,
      contributionDate: dto.contributionDate ?? today(),
      note: dto.note ?? null,
    });
    await this.contributionRepository.save(contribution);

    return this.findOne(goal.id, workspaceId);
  }

  async removeContribution(
    id: string,
    contributionId: string,
    workspaceId: string,
  ): Promise<GoalDetail> {
    const contribution = await this.contributionRepository.findOne({
      where: { id: contributionId, goalId: id, workspaceId },
    });
    assertFound(contribution, 'Contribution');

    await this.contributionRepository.remove(contribution);
    return this.findOne(id, workspaceId);
  }

  /** Totals for many goals in one query, so a list of N goals is not N+1. */
  private async sumContributions(
    workspaceId: string,
    goalIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.contributionRepository
      .createQueryBuilder('contribution')
      .select('contribution.goal_id', 'goalId')
      .addSelect('COALESCE(SUM(contribution.amount), 0)', 'total')
      .where('contribution.workspace_id = :workspaceId', { workspaceId })
      .andWhere('contribution.goal_id IN (:...goalIds)', { goalIds })
      .groupBy('contribution.goal_id')
      .getRawMany<{ goalId: string; total: string }>();

    return new Map(rows.map(row => [row.goalId, toNumber(row.total)]));
  }
}

function toProgress(goal: Goal, currentAmount: number): GoalWithProgress {
  const targetAmount = toNumber(goal.targetAmount);
  const current = round2(currentAmount);

  return {
    id: goal.id,
    name: goal.name,
    targetAmount,
    currency: goal.currency,
    targetDate: goal.targetDate,
    currentAmount: current,
    // A goal can be overshot; what is left to save is never negative.
    remaining: round2(Math.max(targetAmount - current, 0)),
    percent: targetAmount > 0 ? round2((current / targetAmount) * 100) : 0,
    isReached: current >= targetAmount,
    createdAt: goal.createdAt,
  };
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}
