import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Interface density and reduced motion. Defaults keep the current look, so the
 * columns only matter once somebody opts in.
 */
export class AddUserAppearancePreferences1786080000000 implements MigrationInterface {
  name = 'AddUserAppearancePreferences1786080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "ui_density" varchar(16) NOT NULL DEFAULT 'comfortable',
        ADD COLUMN IF NOT EXISTS "reduce_motion" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "reduce_motion",
        DROP COLUMN IF EXISTS "ui_density"
    `);
  }
}
