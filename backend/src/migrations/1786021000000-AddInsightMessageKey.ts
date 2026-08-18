import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsightMessageKey1786021000000 implements MigrationInterface {
  name = 'AddInsightMessageKey1786021000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights"
        ADD COLUMN IF NOT EXISTS "message_key"    varchar(64),
        ADD COLUMN IF NOT EXISTS "message_params" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights"
        DROP COLUMN IF EXISTS "message_params",
        DROP COLUMN IF EXISTS "message_key"
    `);
  }
}
