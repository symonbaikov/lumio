import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('CreateGoals migration', () => {
  const filePath = path.join(process.cwd(), 'src', 'migrations', '1786030000000-CreateGoals.ts');

  it('creates both tables', () => {
    expect(existsSync(filePath)).toBe(true);
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('CREATE TABLE "goals"');
    expect(source).toContain('CREATE TABLE "goal_contributions"');
  });

  it('scopes both tables to a workspace with a cascading foreign key', () => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('FK_goals_workspace');
    expect(source).toContain('FK_goal_contributions_workspace');
    expect(source.match(/REFERENCES "workspaces"\("id"\) ON DELETE CASCADE/g)).toHaveLength(2);
  });

  it('drops contributions before goals so the foreign key holds', () => {
    const source = readFileSync(filePath, 'utf8');
    const contributionsDrop = source.indexOf('DROP TABLE IF EXISTS "goal_contributions"');
    const goalsDrop = source.indexOf('DROP TABLE IF EXISTS "goals"');
    expect(contributionsDrop).toBeGreaterThan(-1);
    expect(contributionsDrop).toBeLessThan(goalsDrop);
  });
});
