import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingCompletedAt1762800000000 implements MigrationInterface {
  name = 'AddOnboardingCompletedAt1762800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "onboarding_completed_at" = NOW()
      WHERE "onboarding_completed_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "onboarding_completed_at"
    `);
  }
}
