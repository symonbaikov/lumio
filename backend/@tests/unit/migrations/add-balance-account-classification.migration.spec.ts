import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('AddBalanceAccountClassification migration', () => {
  const filePath = path.join(
    process.cwd(),
    'src',
    'migrations',
    '1786040000000-AddBalanceAccountClassification.ts',
  );

  it('adds both classification columns', () => {
    expect(existsSync(filePath)).toBe(true);
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS "capital_role"');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS "risk_level"');
  });

  it('leaves existing rows unclassified rather than guessing a value', () => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).not.toContain('NOT NULL');
    expect(source).not.toContain('DEFAULT');
  });

  it('drops the enum types it created on the way down', () => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('DROP TYPE IF EXISTS "balance_accounts_risk_level_enum"');
    expect(source).toContain('DROP TYPE IF EXISTS "balance_accounts_capital_role_enum"');
  });
});
