import type { MigrationInterface, QueryRunner } from 'typeorm';

const ENGLISH_DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: 'income' | 'expense' }> = [
  { name: 'Sales', type: 'income' },
  { name: 'Services', type: 'income' },
  { name: 'Interest Income', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Advertising', type: 'expense' },
  { name: 'Benefits', type: 'expense' },
  { name: 'Car', type: 'expense' },
  { name: 'Equipment', type: 'expense' },
  { name: 'Fees', type: 'expense' },
  { name: 'Home Office', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'Interest', type: 'expense' },
  { name: 'Labor', type: 'expense' },
  { name: 'Maintenance', type: 'expense' },
  { name: 'Materials', type: 'expense' },
  { name: 'Meals and Entertainment', type: 'expense' },
  { name: 'Office Supplies', type: 'expense' },
  { name: 'Other', type: 'expense' },
  { name: 'Professional Services', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Taxes', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
];

export class ReplaceCategoriesWithEnglishDefaults1762010000001 implements MigrationInterface {
  name = 'ReplaceCategoriesWithEnglishDefaults1762010000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const workspaces: Array<{ id: string }> = await queryRunner.query('SELECT id FROM "workspaces"');

    for (const { id: workspaceId } of workspaces) {
      await queryRunner.query(
        'UPDATE "transactions" SET "category_id" = NULL WHERE "workspace_id" = $1',
        [workspaceId],
      );

      await queryRunner.query('DELETE FROM "categories" WHERE "workspace_id" = $1', [workspaceId]);

      for (const category of ENGLISH_DEFAULT_CATEGORIES) {
        await queryRunner.query(
          `
            INSERT INTO "categories" ("workspace_id", "user_id", "name", "type", "is_system", "is_enabled", "created_at", "updated_at")
            VALUES ($1, NULL, $2, $3, true, true, NOW(), NOW())
          `,
          [workspaceId, category.name, category.type],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data migration.
  }
}
