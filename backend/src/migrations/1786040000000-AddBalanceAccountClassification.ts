import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBalanceAccountClassification1786040000000 implements MigrationInterface {
  name = 'AddBalanceAccountClassification1786040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "balance_accounts_capital_role_enum" AS ENUM ('income', 'neutral', 'drain');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "balance_accounts_risk_level_enum" AS ENUM ('low', 'medium', 'high');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Both stay NULL for existing rows: nobody has classified them yet, and
    // guessing a value would feed the allocation rule numbers no user chose.
    await queryRunner.query(`
      ALTER TABLE "balance_accounts"
        ADD COLUMN IF NOT EXISTS "capital_role" "balance_accounts_capital_role_enum",
        ADD COLUMN IF NOT EXISTS "risk_level"   "balance_accounts_risk_level_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "balance_accounts"
        DROP COLUMN IF EXISTS "risk_level",
        DROP COLUMN IF EXISTS "capital_role"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "balance_accounts_risk_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "balance_accounts_capital_role_enum"`);
  }
}
