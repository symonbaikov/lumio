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
      notificationsService as any,
      { resolve: jest.fn().mockResolvedValue('USD') } as any,
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
});
