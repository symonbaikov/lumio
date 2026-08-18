import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('AddInsightMessageKey migration', () => {
  const filePath = path.join(
    process.cwd(),
    'src',
    'migrations',
    '1786021000000-AddInsightMessageKey.ts',
  );

  it('adds the message key and params columns to insights', () => {
    expect(existsSync(filePath)).toBe(true);
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('ALTER TABLE "insights"');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS "message_key"');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS "message_params" jsonb');
  });

  it('adds them as nullable, so rows written before the change stay valid', () => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).not.toContain('NOT NULL');
  });

  it('drops both columns on the way down', () => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('DROP COLUMN IF EXISTS "message_params"');
    expect(source).toContain('DROP COLUMN IF EXISTS "message_key"');
  });
});
