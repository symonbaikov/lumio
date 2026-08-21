import { createRepoMock } from '../../../helpers/create-repo-mock';
import { TaxRuleDirection } from '@/entities/tax-rule.entity';
import { TaxSource, TransactionType } from '@/entities/transaction.entity';
import { TaxAssignmentService } from '@/modules/tax/tax-assignment.service';

describe('TaxAssignmentService', () => {
  let service: TaxAssignmentService;
  let ruleRepo: ReturnType<typeof createRepoMock>;
  let ratesService: {
    findOne: jest.Mock;
    findByCodeForDate: jest.Mock;
    findDefaultForDate: jest.Mock;
  };

  const STANDARD_RATE = {
    id: 'rate-standard',
    code: 'KZ_STANDARD',
    rate: 12,
    isInclusive: true,
    isReverseCharge: false,
  };

  const REDUCED_RATE = {
    id: 'rate-reduced',
    code: 'KZ_REDUCED',
    rate: 0,
    isInclusive: true,
    isReverseCharge: false,
  };

  const base = {
    workspaceId: 'ws-1',
    transactionDate: '2025-06-01',
    amountMinor: 10000,
    categoryId: 'cat-1',
    transactionType: TransactionType.EXPENSE,
    transactionNature: 'goods',
  };

  const rule = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'rule-1',
    workspaceId: 'ws-1',
    categoryId: 'cat-1',
    taxRateCode: 'KZ_STANDARD',
    priority: 0,
    direction: TaxRuleDirection.BOTH,
    isEnabled: true,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ruleRepo = createRepoMock();
    ruleRepo.find.mockResolvedValue([]);
    ratesService = {
      findOne: jest.fn(),
      findByCodeForDate: jest.fn(),
      findDefaultForDate: jest.fn().mockResolvedValue(null),
    };
    service = new TaxAssignmentService(ruleRepo, ratesService as never);
  });

  // ─── operations that are never a taxable supply ────────────

  describe('non-taxable operations', () => {
    it.each(['transfer', 'salary', 'loan', 'tax'])(
      'assesses nothing when the nature is %s',
      async nature => {
        ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);
        ruleRepo.find.mockResolvedValue([rule()]);

        const result = await service.resolve({ ...base, transactionNature: nature });

        expect(result.taxAmount).toBeNull();
        expect(result.taxSource).toBeNull();
        // A default rate being available must not override the exclusion.
        expect(ratesService.findDefaultForDate).not.toHaveBeenCalled();
      },
    );

    it('still taxes ordinary natures', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      for (const nature of ['goods', 'services', 'rent', 'commission', 'subscription']) {
        const result = await service.resolve({ ...base, transactionNature: nature });
        expect(result.taxSource).toBe(TaxSource.DEFAULT);
      }
    });
  });

  describe('uncategorised transactions', () => {
    it('assesses nothing, rather than guessing with the default rate', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({ ...base, categoryId: null });

      // An unclassified transfer the AI failed to label would otherwise be
      // taxed silently.
      expect(result.taxAmount).toBeNull();
      expect(ratesService.findDefaultForDate).not.toHaveBeenCalled();
    });

    it('does not apply to an explicitly chosen rate', async () => {
      ratesService.findOne.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({
        ...base,
        categoryId: null,
        explicitTaxRateId: 'rate-standard',
      });

      expect(result.taxSource).toBe(TaxSource.MANUAL);
    });
  });

  // ─── precedence ────────────────────────────────────────────

  describe('an explicit rate', () => {
    it('wins over every rule and default', async () => {
      ruleRepo.find.mockResolvedValue([rule()]);
      ratesService.findOne.mockResolvedValue(REDUCED_RATE);
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({ ...base, explicitTaxRateId: 'rate-reduced' });

      expect(result).toMatchObject({ taxRateId: 'rate-reduced', taxSource: TaxSource.MANUAL });
      expect(ratesService.findByCodeForDate).not.toHaveBeenCalled();
    });

    it('assesses nothing when the rate is not the workspace’s', async () => {
      ratesService.findOne.mockRejectedValue(new Error('not found'));
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({ ...base, explicitTaxRateId: 'someone-elses-rate' });

      // Falling back here would tax the row at a rate the user did not choose.
      expect(result.taxAmount).toBeNull();
      expect(ratesService.findDefaultForDate).not.toHaveBeenCalled();
    });
  });

  describe('rules', () => {
    it('applies a rule matching the category', async () => {
      ruleRepo.find.mockResolvedValue([rule()]);
      ratesService.findByCodeForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      expect(result).toMatchObject({
        taxRateId: 'rate-standard',
        taxRuleId: 'rule-1',
        taxSource: TaxSource.RULE,
      });
    });

    it('resolves the rate code against the transaction date, not today', async () => {
      ruleRepo.find.mockResolvedValue([rule()]);
      ratesService.findByCodeForDate.mockResolvedValue(STANDARD_RATE);

      await service.resolve({ ...base, transactionDate: '2025-06-01' });

      expect(ratesService.findByCodeForDate).toHaveBeenCalledWith(
        'ws-1',
        'KZ_STANDARD',
        '2025-06-01',
      );
    });

    it('ignores a rule for the other direction', async () => {
      ruleRepo.find.mockResolvedValue([rule({ direction: TaxRuleDirection.INCOME })]);
      ratesService.findDefaultForDate.mockResolvedValue(REDUCED_RATE);

      const result = await service.resolve({ ...base, transactionType: TransactionType.EXPENSE });

      expect(result.taxSource).toBe(TaxSource.DEFAULT);
    });

    it('ignores a rule for another category', async () => {
      ruleRepo.find.mockResolvedValue([rule({ categoryId: 'cat-other' })]);
      ratesService.findDefaultForDate.mockResolvedValue(REDUCED_RATE);

      const result = await service.resolve(base);

      expect(result.taxSource).toBe(TaxSource.DEFAULT);
    });

    it('falls back to a catch-all rule', async () => {
      ruleRepo.find.mockResolvedValue([rule({ id: 'catch-all', categoryId: null })]);
      ratesService.findByCodeForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      expect(result.taxRuleId).toBe('catch-all');
    });

    it('prefers the higher priority', async () => {
      ruleRepo.find.mockResolvedValue([
        rule({ id: 'low', priority: 1 }),
        rule({ id: 'high', priority: 9 }),
      ]);
      ratesService.findByCodeForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      expect(result.taxRuleId).toBe('high');
    });

    it('prefers a category rule over a catch-all at equal priority', async () => {
      ruleRepo.find.mockResolvedValue([
        rule({ id: 'catch-all', categoryId: null }),
        rule({ id: 'specific', categoryId: 'cat-1' }),
      ]);
      ratesService.findByCodeForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      expect(result.taxRuleId).toBe('specific');
    });

    it('assesses nothing when the rule names a code with no version in force', async () => {
      ruleRepo.find.mockResolvedValue([rule()]);
      ratesService.findByCodeForDate.mockResolvedValue(null);
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      // Substituting a different rate would tax the row at a figure nobody
      // configured, and it would look deliberate afterwards.
      expect(result.taxAmount).toBeNull();
      expect(ratesService.findDefaultForDate).not.toHaveBeenCalled();
    });
  });

  describe('the workspace default', () => {
    it('applies when no rule matches', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve(base);

      expect(result).toMatchObject({ taxSource: TaxSource.DEFAULT, taxRuleId: null });
    });

    it('assesses nothing when the workspace has no default for that date', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(null);

      const result = await service.resolve(base);

      expect(result.taxAmount).toBeNull();
      expect(result.taxSource).toBeNull();
    });
  });

  // ─── the figures ───────────────────────────────────────────

  describe('computed figures', () => {
    it('extracts 12% from a gross 100.00', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({ ...base, amountMinor: 10000 });

      expect(result.taxAmount).toBe(10.71);
      expect(result.taxNetAmount).toBe(89.29);
    });

    it('mirrors the figures for a refund', async () => {
      ratesService.findDefaultForDate.mockResolvedValue(STANDARD_RATE);

      const result = await service.resolve({ ...base, amountMinor: -10000 });

      expect(result.taxAmount).toBe(-10.71);
      expect(result.taxNetAmount).toBe(-89.29);
    });

    it('charges nothing on a reverse-charge rate but keeps the flag', async () => {
      ratesService.findDefaultForDate.mockResolvedValue({
        ...STANDARD_RATE,
        isReverseCharge: true,
      });

      const result = await service.resolve(base);

      expect(result.taxAmount).toBe(0);
      expect(result.taxNetAmount).toBe(100);
      expect(result.taxReverseCharge).toBe(true);
    });

    it('accepts a rate arriving as a decimal string from the database', async () => {
      ratesService.findDefaultForDate.mockResolvedValue({ ...STANDARD_RATE, rate: '12.00' });

      const result = await service.resolve(base);

      expect(result.taxAmount).toBe(10.71);
    });
  });
});
