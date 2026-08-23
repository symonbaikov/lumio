import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits the payables table into money we owe and money owed to us.
 * Existing rows keep their meaning: every one of them is a payable.
 */
export class AddPayableDirection1786070000000 implements MigrationInterface {
  name = 'AddPayableDirection1786070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payables_direction_enum" AS ENUM ('payable', 'receivable')
    `);
    await queryRunner.query(`
      ALTER TABLE "payables"
      ADD COLUMN "direction" "payables_direction_enum" NOT NULL DEFAULT 'payable'
    `);

    // The status index is always probed together with direction now.
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payables_workspace_status"');
    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_status"
      ON "payables" ("workspace_id", "direction", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payables_workspace_status"');
    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_status"
      ON "payables" ("workspace_id", "status")
    `);
    await queryRunner.query('ALTER TABLE "payables" DROP COLUMN "direction"');
    await queryRunner.query('DROP TYPE "payables_direction_enum"');
  }
}
