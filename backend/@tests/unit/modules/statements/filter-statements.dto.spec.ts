import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FilterStatementsDto } from '@/modules/statements/dto/filter-statements.dto';

describe('FilterStatementsDto', () => {
  it('transforms query values into typed filter fields', async () => {
    const dto = plainToInstance(FilterStatementsDto, {
      page: '2',
      limit: '15',
      search: 'kaspi',
      type: 'pdf',
      statuses: ['processing', 'error'],
      from: 'user:user-1,bank:kaspi',
      to: ['bank:bereke_new'],
      keywords: 'alex',
      amountMin: '10.5',
      amountMax: '100.25',
      approved: 'true',
      billable: 'false',
      groupBy: 'amount',
      has: 'errors,transactions',
      currencies: ['KZT', 'USD'],
      exported: 'true',
      paid: 'false',
      datePreset: 'thisMonth',
      dateMode: 'after',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      categoryId: 'cat-1',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
    expect(dto.statuses).toEqual(['processing', 'error']);
    expect(dto.from).toEqual(['user:user-1', 'bank:kaspi']);
    expect(dto.to).toEqual(['bank:bereke_new']);
    expect(dto.amountMin).toBe(10.5);
    expect(dto.amountMax).toBe(100.25);
    expect(dto.approved).toBe(true);
    expect(dto.billable).toBe(false);
    expect(dto.has).toEqual(['errors', 'transactions']);
    expect(dto.currencies).toEqual(['KZT', 'USD']);
    expect(dto.exported).toBe(true);
    expect(dto.paid).toBe(false);
  });
});
