import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTwoFactor1786050000000 implements MigrationInterface {
  name = 'AddUserTwoFactor1786050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Secret stays NULL until the user starts setup; enabled_at stays NULL until
    // a code is confirmed, so existing users keep logging in with a password only.
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "two_factor_secret" text,
        ADD COLUMN IF NOT EXISTS "two_factor_enabled_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "two_factor_recovery_codes" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "two_factor_recovery_codes",
        DROP COLUMN IF EXISTS "two_factor_enabled_at",
        DROP COLUMN IF EXISTS "two_factor_secret"
    `);
  }
}
