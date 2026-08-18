import { SubscriptionFrequency, SubscriptionStatus } from '@/entities/subscription.entity';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';

const createRepoMock = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('SubscriptionsService', () => {
  const subscriptionRepository = createRepoMock();
  const notificationsService = {
    createForWorkspaceMembers: jest.fn(),
  };
  const workspaceMemberRepository = {
    findOne: jest.fn(),
  };
  const decisionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const transactionRepository = {
    find: jest.fn(),
  };
  const chargeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const workspaceRepository = {
    findOne: jest.fn(),
  };
  const exchangeRatesService = {
    convert: jest.fn(),
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SubscriptionsService(
      subscriptionRepository as any,
      notificationsService as any,
      workspaceMemberRepository as any,
      decisionRepository as any,
      transactionRepository as any,
      chargeRepository as any,
      workspaceRepository as any,
      exchangeRatesService as any,
    );
  });

  describe('getSummary', () => {
    it('normalizes active subscription costs to monthly and sums them', async () => {
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 100,
          currency: 'USD',
          frequency: SubscriptionFrequency.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);

      const result = await service.getSummary('workspace-1');

      expect(result).toEqual({
        totalMonthlyCost: 100,
        activeCount: 1,
        upcomingCount: 0,
        upcoming30DaysCount: 0,
        priceChangeCount: 0,
        overdueReviewCount: 0,
        realizedAnnualSavings: 0,
      });
    });

    it('normalizes annual subscriptions to monthly cost', async () => {
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 1200,
          currency: 'KZT',
          frequency: SubscriptionFrequency.ANNUAL,
          status: SubscriptionStatus.ACTIVE,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);

      const result = await service.getSummary('workspace-1');

      expect(result.totalMonthlyCost).toBe(100);
    });

    it('converts normalized monthly spend to the workspace currency', async () => {
      workspaceRepository.findOne.mockResolvedValue({ currency: 'EUR' });
      subscriptionRepository.find.mockResolvedValue([
        { amount: 100, currency: 'USD', frequency: SubscriptionFrequency.MONTHLY, status: SubscriptionStatus.ACTIVE },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);
      exchangeRatesService.convert.mockResolvedValue({ converted: 90 });

      const result = await service.getSummary('workspace-1');

      expect(exchangeRatesService.convert).toHaveBeenCalledWith(100, 'USD', 'EUR', expect.any(Date));
      expect(result.totalMonthlyCost).toBe(90);
    });

    it('returns management KPIs for price changes, overdue reviews, and realized savings', async () => {
      subscriptionRepository.find.mockResolvedValue([
        {
          amount: 100,
          currency: 'USD',
          frequency: SubscriptionFrequency.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          reviewAt: new Date('2026-08-03T00:00:00.000Z'),
          riskStatus: 'price_changed',
          realizedAnnualSavings: 1_200,
        },
      ]);
      subscriptionRepository.count.mockResolvedValue(0);

      const result = await service.getSummary('workspace-1');

      expect(result).toMatchObject({
        totalMonthlyCost: 100,
        activeCount: 1,
        upcomingCount: 0,
        upcoming30DaysCount: 0,
        priceChangeCount: 1,
        overdueReviewCount: 1,
        realizedAnnualSavings: 1_200,
      });
    });
  });

  describe('assignOwner', () => {
    it('assigns only a member of the current workspace and records the decision', async () => {
      const subscription = { id: 'subscription-1', workspaceId: 'workspace-1', ownerId: null };
      workspaceMemberRepository.findOne.mockResolvedValue({ userId: 'owner-1', workspaceId: 'workspace-1' });
      subscriptionRepository.findOne.mockResolvedValue(subscription);
      subscriptionRepository.save.mockResolvedValue({ ...subscription, ownerId: 'owner-1' });
      decisionRepository.create.mockImplementation(value => value);
      decisionRepository.save.mockImplementation(value => value);

      const result = await service.assignOwner('subscription-1', 'workspace-1', 'owner-1', 'actor-1');

      expect(workspaceMemberRepository.findOne).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1', userId: 'owner-1' },
      });
      expect(subscriptionRepository.save).toHaveBeenCalledWith({ ...subscription, ownerId: 'owner-1' });
      expect(decisionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'owner_assigned', actorId: 'actor-1', ownerId: 'owner-1' }),
      );
      expect(result.ownerId).toBe('owner-1');
    });
  });

  describe('confirm', () => {
    it('records the detected transaction evidence as immutable charge history', async () => {
      const subscription = {
        id: 'subscription-1', workspaceId: 'workspace-1', status: SubscriptionStatus.DETECTED,
        amount: 100, currency: 'USD', nextChargeDate: new Date('2026-09-01'), detectionMeta: { transactionIds: ['tx-1'] },
      };
      subscriptionRepository.findOne.mockResolvedValue(subscription);
      subscriptionRepository.save.mockResolvedValue({ ...subscription, status: SubscriptionStatus.ACTIVE });
      transactionRepository.find.mockResolvedValue([{ id: 'tx-1', amount: 105, currency: 'USD', transactionDate: new Date('2026-08-01') }]);
      chargeRepository.findOne.mockResolvedValue(null);
      chargeRepository.create.mockImplementation(value => value);
      chargeRepository.save.mockImplementation(value => value);

      await service.confirm('subscription-1', 'workspace-1');

      expect(chargeRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        transactionId: 'tx-1', subscriptionId: 'subscription-1', matchStatus: 'matched', expectedAmount: 100,
      }));
    });

    it('flags a confirmed subscription when its transaction price changes materially', async () => {
      const subscription = {
        id: 'subscription-1', workspaceId: 'workspace-1', status: SubscriptionStatus.DETECTED,
        amount: 100, currency: 'USD', nextChargeDate: new Date('2026-09-01'), detectionMeta: { transactionIds: ['tx-1'] },
      };
      subscriptionRepository.findOne.mockResolvedValue(subscription);
      subscriptionRepository.save.mockImplementation(value => value);
      transactionRepository.find.mockResolvedValue([{ id: 'tx-1', amount: 120, currency: 'USD', transactionDate: new Date('2026-08-01') }]);
      chargeRepository.findOne.mockResolvedValue(null);
      chargeRepository.create.mockImplementation(value => value);
      chargeRepository.save.mockImplementation(value => value);

      await service.confirm('subscription-1', 'workspace-1');

      expect(chargeRepository.save).toHaveBeenCalledWith(expect.objectContaining({ matchStatus: 'price_changed' }));
      expect(subscriptionRepository.save).toHaveBeenLastCalledWith(expect.objectContaining({ riskStatus: 'price_changed' }));
    });
  });
});
