import { Payable, PayableSource, PayableStatus } from '../../../src/entities/payable.entity';

describe('Payable entity', () => {
  it('should instantiate with default values', () => {
    const payable = new Payable();

    expect(payable).toBeDefined();
    expect(payable).toBeInstanceOf(Payable);
  });

  it('should have correct enum values for PayableStatus', () => {
    expect(PayableStatus.TO_PAY).toBe('to_pay');
    expect(PayableStatus.SCHEDULED).toBe('scheduled');
    expect(PayableStatus.PAID).toBe('paid');
    expect(PayableStatus.OVERDUE).toBe('overdue');
    expect(PayableStatus.ARCHIVED).toBe('archived');
  });

  it('should have correct enum values for PayableSource', () => {
    expect(PayableSource.STATEMENT).toBe('statement');
    expect(PayableSource.INVOICE).toBe('invoice');
    expect(PayableSource.MANUAL).toBe('manual');
  });
});
