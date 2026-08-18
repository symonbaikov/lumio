import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SheetTransactionCommitDto } from '@/modules/import/dto/sheet-transaction-commit.dto';

describe('SheetTransactionCommitDto', () => {
  it('reports a validation error on `name` when it is missing', async () => {
    const dto = plainToInstance(SheetTransactionCommitDto, { defaultCurrency: 'USD' });
    const errors = await validate(dto);
    const nameErrors = errors.filter(error => error.property === 'name');
    expect(nameErrors.length).toBeGreaterThan(0);
  });

  it('reports no error on `name` when it is a valid non-empty string', async () => {
    const dto = plainToInstance(SheetTransactionCommitDto, {
      defaultCurrency: 'USD',
      name: 'My import',
    });
    const errors = await validate(dto);
    const nameErrors = errors.filter(error => error.property === 'name');
    expect(nameErrors).toHaveLength(0);
  });

  it('passes validation with all required fields present', async () => {
    const dto = plainToInstance(SheetTransactionCommitDto, {
      defaultCurrency: 'USD',
      name: 'My import',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
