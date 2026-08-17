import type { SheetColumnRole } from '../../../../../src/modules/import/sheets/column-roles';
import { mapSheetRows } from '../../../../../src/modules/import/sheets/map-sheet-rows';

const mapping = { roles: ['date', 'description', 'amount'] as SheetColumnRole[], defaultCurrency: 'KZT' };

describe('mapSheetRows', () => {
  it('maps a signed amount to debit for a negative value', () => {
    const { rows } = mapSheetRows([['01.02.2024', 'Магнит', '-1 200,50']], mapping);
    expect(rows[0]).toMatchObject({
      status: 'ok',
      transaction: { debit: 1200.5, credit: undefined, paymentPurpose: 'Магнит', currency: 'KZT' },
    });
  });

  it('maps a positive signed amount to credit', () => {
    const { rows } = mapSheetRows([['01.02.2024', 'Зарплата', '500000']], mapping);
    expect(rows[0].transaction).toMatchObject({ credit: 500000, debit: undefined });
  });

  it('merges separate debit and credit columns', () => {
    const m = { roles: ['date', 'debit', 'credit'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    const { rows } = mapSheetRows([['01.02.2024', '1200', ''], ['02.02.2024', '', '5000']], m);
    expect(rows[0].transaction).toMatchObject({ debit: 1200, credit: undefined });
    expect(rows[1].transaction).toMatchObject({ credit: 5000, debit: undefined });
  });

  it('flags an unparseable date instead of throwing', () => {
    const { rows } = mapSheetRows([['не дата', 'x', '100']], mapping);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['invalid_date'] });
  });

  it('flags a zero or empty amount', () => {
    const { rows } = mapSheetRows([['01.02.2024', 'x', '0']], mapping);
    expect(rows[0].issues).toContain('zero_amount');
  });

  it('flags a duplicate within the same file', () => {
    const { rows } = mapSheetRows(
      [['01.02.2024', 'Магнит', '-100'], ['01.02.2024', 'Магнит', '-100']],
      mapping,
    );
    expect(rows[1]).toMatchObject({ status: 'invalid', issues: ['duplicate_in_file'] });
  });

  it('skips heading and total rows by rowNumber', () => {
    const { rows, summary } = mapSheetRows(
      [['ИТОГО', '', '-5000'], ['01.02.2024', 'x', '-100']],
      { ...mapping, skipRowNumbers: [1] },
    );
    expect(rows[0].status).toBe('skipped');
    expect(summary).toMatchObject({ ok: 1, invalid: 0, skipped: 1 });
  });

  it('falls back to the description when there is no counterparty column', () => {
    const { rows } = mapSheetRows([['01.02.2024', 'Магнит', '-100']], mapping);
    expect(rows[0].transaction?.counterpartyName).toBe('Магнит');
  });

  // --- Additional judgment-call coverage per plan notes ---

  it('treats a blank date cell the same as an unparseable one', () => {
    const { rows } = mapSheetRows([['', 'x', '100']], mapping);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['invalid_date'] });
  });

  it('flags invalid_amount when both debit and credit columns are non-zero', () => {
    const m = { roles: ['date', 'debit', 'credit'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    const { rows } = mapSheetRows([['01.02.2024', '100', '200']], m);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['invalid_amount'] });
  });

  it('flags zero_amount when both debit and credit columns are empty', () => {
    const m = { roles: ['date', 'debit', 'credit'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    const { rows } = mapSheetRows([['01.02.2024', '', '']], m);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['zero_amount'] });
  });

  it('flags zero_amount when both debit and credit columns are unparseable garbage text', () => {
    // Consistent with the "both empty" case: unparseable debit/credit text is
    // treated the same as "no genuine amount present" rather than as
    // rejection-worthy garbage, so this also resolves to zero_amount.
    const m = { roles: ['date', 'debit', 'credit'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    const { rows } = mapSheetRows([['01.02.2024', 'abc', 'xyz']], m);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['zero_amount'] });
  });

  it('inverts the sign interpretation of a bare amount column when invertSign is true', () => {
    const m = { ...mapping, invertSign: true };
    const { rows } = mapSheetRows(
      [['01.02.2024', 'Магнит', '100'], ['02.02.2024', 'Возврат', '-50']],
      m,
    );
    expect(rows[0].transaction).toMatchObject({ debit: 100, credit: undefined });
    expect(rows[1].transaction).toMatchObject({ credit: 50, debit: undefined });
  });

  it('defaults paymentPurpose and counterpartyName when neither description nor counterparty roles are mapped', () => {
    const m = { roles: ['date', 'amount'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    const { rows } = mapSheetRows([['01.02.2024', '-100']], m);
    expect(rows[0].transaction).toMatchObject({ paymentPurpose: '', counterpartyName: '—' });
  });

  it('flags unknown_currency and falls back to defaultCurrency for a non-ISO code', () => {
    const m = {
      roles: ['date', 'description', 'amount', 'currency'] as SheetColumnRole[],
      defaultCurrency: 'KZT',
    };
    const { rows } = mapSheetRows([['01.02.2024', 'x', '-100', '123']], m);
    expect(rows[0]).toMatchObject({ status: 'ok', issues: ['unknown_currency'] });
    expect(rows[0].transaction?.currency).toBe('KZT');
  });

  it('accepts a valid 3-letter ISO currency code, case-insensitively', () => {
    const m = {
      roles: ['date', 'description', 'amount', 'currency'] as SheetColumnRole[],
      defaultCurrency: 'KZT',
    };
    const { rows } = mapSheetRows([['01.02.2024', 'x', '-100', 'usd']], m);
    expect(rows[0].transaction?.currency).toBe('USD');
    expect(rows[0].issues).not.toContain('unknown_currency');
  });

  it('skips a row where every cell is empty', () => {
    const { rows, summary } = mapSheetRows([['', '', '']], mapping);
    expect(rows[0]).toMatchObject({ status: 'skipped', issues: [] });
    expect(rows[0].transaction).toBeUndefined();
    expect(summary).toMatchObject({ ok: 0, invalid: 0, skipped: 1 });
  });

  it('does not let a skipped row participate in dedup', () => {
    const { rows } = mapSheetRows(
      [['', '', ''], ['', '', '']],
      mapping,
    );
    expect(rows[0].status).toBe('skipped');
    expect(rows[1].status).toBe('skipped');
  });

  it('never throws on wildly malformed cell data and degrades to invalid', () => {
    const values = [[{ weird: true } as unknown as string, [1, 2] as unknown as string, Symbol('x') as unknown as string]];
    expect(() => mapSheetRows(values, mapping)).not.toThrow();
    const { rows } = mapSheetRows(values, mapping);
    expect(rows[0].status).toBe('invalid');
  });

  it('handles an empty values array', () => {
    const { rows, summary } = mapSheetRows([], mapping);
    expect(rows).toEqual([]);
    expect(summary).toEqual({ ok: 0, invalid: 0, skipped: 0 });
  });

  it('handles a row shorter than mapping.roles', () => {
    const { rows } = mapSheetRows([['01.02.2024']], mapping);
    expect(rows[0]).toMatchObject({ status: 'invalid', issues: ['invalid_amount'] });
  });

  it('ignores extra cells beyond mapping.roles length', () => {
    const { rows } = mapSheetRows([['01.02.2024', 'x', '-100', 'extra', 'more']], mapping);
    expect(rows[0].status).toBe('ok');
  });

  it('treats duplicate roles in mapping as first-occurrence-wins without crashing', () => {
    const m = { roles: ['date', 'date', 'amount'] as SheetColumnRole[], defaultCurrency: 'KZT' };
    expect(() => mapSheetRows([['01.02.2024', '02.02.2024', '-100']], m)).not.toThrow();
    const { rows } = mapSheetRows([['01.02.2024', '02.02.2024', '-100']], m);
    expect(rows[0].transaction?.transactionDate).toEqual(new Date(Date.UTC(2024, 1, 1)));
  });
});
