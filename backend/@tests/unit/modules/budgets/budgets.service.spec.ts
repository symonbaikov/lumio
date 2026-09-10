import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetPeriodType } from '@/entities/budget.entity';
import { BudgetsService } from '@/modules/budgets/budgets.service';

const createRepoMock = () => ({
  create: jest.fn((data: unknown) => data),
  save: jest.fn(async (data: unknown) => data),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (total: string) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({ total }),
});

describe('BudgetsService', () => {
  const budgetRepository = createRepoMock();
  const transactionRepository = createRepoMock();
  const goalRepository = createRepoMock();
  const notificationsService = {
    createForWorkspaceMembers: jest.fn(),
  };

  let service: BudgetsService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
    service = new BudgetsService(
      budgetRepository as any,
      transactionRepository as any,
      goalRepository as any,
      notificationsService as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns budgets with spending computed from transactions', async () => {
    budgetRepository.find.mockResolvedValue([
      {
        id: 'budget-1',
        workspaceId: 'workspace-1',
        categoryId: 'category-1',
        name: 'Cloud tools',
        limitAmount: 100,
        currency: 'USD',
        periodType: BudgetPeriodType.MONTHLY,
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);
    transactionRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock('30'),
    );

    const result = await service.findAll('workspace-1');

    expect(result[0]).toEqual(
      expect.objectContaining({
        limitAmount: 100,
        spentAmount: 30,
        percentUsed: 30,
        currency: 'USD',
      }),
    );
  });

  it('creates a budget with correct fields', async () => {
    budgetRepository.findOne.mockResolvedValue(null);

    await service.create('workspace-1', 'user-1', {
      name: 'Rent',
      categoryId: 'category-1',
      limitAmount: 10000,
      currency: 'KZT',
      periodType: BudgetPeriodType.MONTHLY,
    });

    expect(budgetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rent',
        categoryId: 'category-1',
        limitAmount: 10000,
        currency: 'KZT',
        periodType: BudgetPeriodType.MONTHLY,
      }),
    );
  });

  it('accepts fields on update via Object.assign', async () => {
    const budget = {
      id: 'budget-1',
      workspaceId: 'workspace-1',
      categoryId: 'category-1',
      name: 'Rent',
      limitAmount: 10000,
      currency: 'KZT',
      periodType: BudgetPeriodType.MONTHLY,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    };
    budgetRepository.findOne.mockResolvedValue(budget);

    await service.update('budget-1', 'workspace-1', {
      name: 'Rent updated',
      limitAmount: 12000,
    });

    expect(budgetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rent updated',
        limitAmount: 12000,
        categoryId: 'category-1',
        periodType: BudgetPeriodType.MONTHLY,
      }),
    );
  });

  it('attaches a budget to a goal of the same workspace', async () => {
    budgetRepository.findOne.mockResolvedValue(null);
    goalRepository.findOne.mockResolvedValue({ id: 'goal-1', workspaceId: 'workspace-1' });

    await service.create('workspace-1', 'user-1', {
      name: 'Renovation supplies',
      categoryId: 'category-1',
      limitAmount: 50000,
      periodType: BudgetPeriodType.MONTHLY,
      goalId: 'goal-1',
    });

    expect(goalRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'goal-1', workspaceId: 'workspace-1' },
    });
    expect(budgetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: 'goal-1' }),
    );
  });

  it('leaves goalId null when no goal is given', async () => {
    budgetRepository.findOne.mockResolvedValue(null);

    await service.create('workspace-1', 'user-1', {
      name: 'Rent',
      categoryId: 'category-1',
      limitAmount: 10000,
      periodType: BudgetPeriodType.MONTHLY,
    });

    expect(goalRepository.findOne).not.toHaveBeenCalled();
    expect(budgetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: null }),
    );
  });

  it('refuses a goal that belongs to another workspace', async () => {
    budgetRepository.findOne.mockResolvedValue(null);
    goalRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create('workspace-1', 'user-1', {
        name: 'Rent',
        categoryId: 'category-1',
        limitAmount: 10000,
        periodType: BudgetPeriodType.MONTHLY,
        goalId: 'goal-of-another-tenant',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('checks the goal on update before assigning the payload', async () => {
    budgetRepository.findOne.mockResolvedValue({
      id: 'budget-1',
      workspaceId: 'workspace-1',
      categoryId: 'category-1',
      goalId: null,
    });
    goalRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update('budget-1', 'workspace-1', { goalId: 'goal-of-another-tenant' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('detaches a budget from its goal when goalId is explicitly null', async () => {
    budgetRepository.findOne.mockResolvedValue({
      id: 'budget-1',
      workspaceId: 'workspace-1',
      categoryId: 'category-1',
      goalId: 'goal-1',
    });

    await service.update('budget-1', 'workspace-1', { goalId: null });

    expect(goalRepository.findOne).not.toHaveBeenCalled();
    expect(budgetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: null }),
    );
  });

  describe('project budgets', () => {
    it('allows a second budget on a category when it serves a goal', async () => {
      // No unattached budget matches, because the create looks for one scoped
      // to the same goal — the household limit on this category is a different
      // row and must not block the project one.
      budgetRepository.findOne.mockResolvedValue(null);
      goalRepository.findOne.mockResolvedValue({ id: 'goal-1', workspaceId: 'workspace-1' });

      await service.create('workspace-1', 'user-1', {
        name: 'Transport for the move',
        categoryId: 'category-1',
        limitAmount: 200000,
        periodType: BudgetPeriodType.MONTHLY,
        goalId: 'goal-1',
      });

      expect(budgetRepository.findOne).toHaveBeenCalledWith({
        where: {
          workspaceId: 'workspace-1',
          categoryId: 'category-1',
          periodType: BudgetPeriodType.MONTHLY,
          goalId: 'goal-1',
        },
      });
      expect(budgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ goalId: 'goal-1' }),
      );
    });

    it('still rejects a duplicate within the same goal', async () => {
      budgetRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('workspace-1', 'user-1', {
          name: 'Transport for the move',
          categoryId: 'category-1',
          limitAmount: 200000,
          periodType: BudgetPeriodType.MONTHLY,
          goalId: 'goal-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('stores the window it was given', async () => {
      budgetRepository.findOne.mockResolvedValue(null);

      await service.create('workspace-1', 'user-1', {
        name: 'Moving costs',
        categoryId: 'category-1',
        limitAmount: 300000,
        periodType: BudgetPeriodType.MONTHLY,
        startsOn: '2026-02-01',
        endsOn: '2026-08-31',
      });

      expect(budgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ startsOn: '2026-02-01', endsOn: '2026-08-31' }),
      );
    });

    it('refuses a window that ends before it starts', async () => {
      budgetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('workspace-1', 'user-1', {
          name: 'Moving costs',
          categoryId: 'category-1',
          limitAmount: 300000,
          periodType: BudgetPeriodType.MONTHLY,
          startsOn: '2026-08-01',
          endsOn: '2026-02-28',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('counts only the part of the month the budget governs', async () => {
      budgetRepository.find.mockResolvedValue([
        {
          id: 'budget-1',
          workspaceId: 'workspace-1',
          categoryId: 'category-1',
          name: 'Moving costs',
          limitAmount: 300000,
          currency: 'KZT',
          periodType: BudgetPeriodType.MONTHLY,
          currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
          startsOn: '2026-05-05',
          endsOn: null,
        },
      ]);
      const builder = createQueryBuilderMock('50000');
      transactionRepository.createQueryBuilder.mockReturnValue(builder);

      const [budget] = await service.findAll('workspace-1');

      expect(budget.isActive).toBe(true);
      // The 1st to the 4th is outside the window and never reaches the query.
      expect(builder.andWhere).toHaveBeenCalledWith('t.transaction_date >= :start', {
        start: new Date(2026, 4, 5),
      });
    });

    it('reports no spending once the window has closed', async () => {
      budgetRepository.find.mockResolvedValue([
        {
          id: 'budget-1',
          workspaceId: 'workspace-1',
          categoryId: 'category-1',
          name: 'Moving costs',
          limitAmount: 300000,
          currency: 'KZT',
          periodType: BudgetPeriodType.MONTHLY,
          currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
          startsOn: '2026-01-01',
          endsOn: '2026-03-31',
        },
      ]);

      const [budget] = await service.findAll('workspace-1');

      expect(budget.spentAmount).toBe(0);
      expect(budget.percentUsed).toBe(0);
      expect(budget.isActive).toBe(false);
      expect(transactionRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('stops alerting on a budget whose window has closed', async () => {
      budgetRepository.find.mockResolvedValue([
        {
          id: 'budget-1',
          workspaceId: 'workspace-1',
          categoryId: 'category-1',
          name: 'Moving costs',
          limitAmount: 100,
          currency: 'KZT',
          periodType: BudgetPeriodType.MONTHLY,
          currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
          startsOn: '2026-01-01',
          endsOn: '2026-03-31',
          alertAt80Sent: false,
          alertAt100Sent: false,
        },
      ]);

      await service.checkBudgetAlerts('workspace-1');

      expect(notificationsService.createForWorkspaceMembers).not.toHaveBeenCalled();
    });
  });
});
