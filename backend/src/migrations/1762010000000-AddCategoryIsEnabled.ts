import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIsEnabled1762010000000 implements MigrationInterface {
  name = 'AddCategoryIsEnabled1762010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_enabled" boolean NOT NULL DEFAULT true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "categories" DROP COLUMN IF EXISTS "is_enabled"');
  }
}
