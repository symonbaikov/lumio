import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToCategoryLearning1762100000000 implements MigrationInterface {
  name = 'AddWorkspaceIdToCategoryLearning1762100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCategoryLearning = await queryRunner.hasTable('category_learning');
    if (!hasCategoryLearning) {
      return;
    }

    await queryRunner.query(
      'ALTER TABLE "category_learning" ADD COLUMN IF NOT EXISTS "workspace_id" uuid',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_category_learning_workspace" ON "category_learning" ("workspace_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_category_learning_workspace_category" ON "category_learning" ("workspace_id", "category_id")',
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_category_learning_workspace'
        ) THEN
          ALTER TABLE "category_learning"
          ADD CONSTRAINT "FK_category_learning_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'category_learning_learnedfrom_enum'
        ) THEN
          ALTER TYPE "category_learning_learnedfrom_enum"
          ADD VALUE IF NOT EXISTS 'ai_classification';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCategoryLearning = await queryRunner.hasTable('category_learning');
    if (!hasCategoryLearning) {
      return;
    }

    await queryRunner.query(
      'ALTER TABLE "category_learning" DROP CONSTRAINT IF EXISTS "FK_category_learning_workspace"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace_category"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_category_learning_workspace"');
    await queryRunner.query('ALTER TABLE "category_learning" DROP COLUMN IF EXISTS "workspace_id"');

    // PostgreSQL does not support removing enum values; keep ai_classification value.
  }
}
