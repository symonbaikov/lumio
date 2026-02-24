import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptSourceAndNullableGmail1762700000000 implements MigrationInterface {
  name = 'AddReceiptSourceAndNullableGmail1762700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipts_source_enum') THEN
          CREATE TYPE "receipts_source_enum" AS ENUM ('gmail', 'upload', 'telegram', 'scan');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ADD COLUMN IF NOT EXISTS "source" "receipts_source_enum" NOT NULL DEFAULT 'gmail'
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ALTER COLUMN "gmail_message_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ALTER COLUMN "gmail_thread_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      DROP CONSTRAINT IF EXISTS "UQ_receipts_gmail_message_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_receipts_gmail_message_id"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_receipts_gmail_message_id_unique_not_null"
      ON "receipts" ("gmail_message_id")
      WHERE "gmail_message_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_receipts_gmail_message_id_unique_not_null"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_receipts_gmail_message_id"
      ON "receipts" ("gmail_message_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ADD CONSTRAINT "UQ_receipts_gmail_message_id" UNIQUE ("gmail_message_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ALTER COLUMN "gmail_message_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ALTER COLUMN "gmail_thread_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      DROP COLUMN IF EXISTS "source"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "receipts_source_enum"
    `);
  }
}
