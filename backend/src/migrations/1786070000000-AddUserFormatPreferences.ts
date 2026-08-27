import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Regional formatting preferences. Both default to "follow the interface
 * language", so nobody's dates change until they pick something themselves.
 */
export class AddUserFormatPreferences1786070000000 implements MigrationInterface {
  name = 'AddUserFormatPreferences1786070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "date_format" varchar(8) NOT NULL DEFAULT 'auto',
        ADD COLUMN IF NOT EXISTS "first_day_of_week" smallint
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "first_day_of_week",
        DROP COLUMN IF EXISTS "date_format"
    `);
  }
}
