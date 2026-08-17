import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionSplits1786020000000 implements MigrationInterface {
  name = 'AddTransactionSplits1786020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD "split_group_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD "split_index" smallint
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_workspace_split_group"
      ON "transactions" ("workspace_id", "split_group_id")
      WHERE "split_group_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_workspace_split_group"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "split_index"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "split_group_id"`);
  }
}
