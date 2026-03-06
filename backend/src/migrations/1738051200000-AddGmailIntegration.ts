import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGmailIntegration1738051200000 implements MigrationInterface {
  name = 'AddGmailIntegration1738051200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: integrations.provider is varchar in existing schema; no enum alteration required

    // Create gmail_settings table
    await queryRunner.query(`
      CREATE TABLE "gmail_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integration_id" uuid NOT NULL,
        "label_id" character varying,
        "label_name" character varying NOT NULL DEFAULT 'Lumio/Receipts',
        "filter_enabled" boolean NOT NULL DEFAULT true,
        "filter_config" jsonb,
        "watch_enabled" boolean NOT NULL DEFAULT false,
        "watch_expiration" TIMESTAMP,
        "last_sync_at" TIMESTAMP,
        "history_id" character varying,
        CONSTRAINT "UQ_gmail_settings_integration_id" UNIQUE ("integration_id"),
        CONSTRAINT "PK_gmail_settings" PRIMARY KEY ("id")
      )
    `);

    // Create gmail_watch_subscriptions table with enum-backed status
    await queryRunner.query(`
      CREATE TYPE "gmail_watch_subscription_status_enum" AS ENUM ('active','expired','error')
    `);

    await queryRunner.query(`
      CREATE TABLE "gmail_watch_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integration_id" uuid NOT NULL,
        "topic_name" character varying NOT NULL,
        "subscription_name" character varying NOT NULL,
        "expiration" TIMESTAMP NOT NULL,
        "history_id" character varying,
        "status" gmail_watch_subscription_status_enum NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gmail_watch_subscriptions" PRIMARY KEY ("id")
      )
    `);

    // Create receipts_status_enum type for receipts.status (include all ReceiptStatus values)
    await queryRunner.query(`
      CREATE TYPE "receipts_status_enum" AS ENUM ('draft','new','parsed','needs_review','reviewed','approved','rejected','failed')
    `);

    // Create receipts table
    await queryRunner.query(`
      CREATE TABLE "receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "gmail_message_id" character varying NOT NULL,
        "gmail_thread_id" character varying NOT NULL,
        "subject" character varying NOT NULL,
        "sender" character varying NOT NULL,
        "received_at" TIMESTAMP NOT NULL,
        "status" receipts_status_enum NOT NULL DEFAULT 'draft',
        "metadata" jsonb,
        "parsed_data" jsonb,
        "attachment_paths" text array,
        "transaction_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_receipts_gmail_message_id" UNIQUE ("gmail_message_id"),
        CONSTRAINT "PK_receipts" PRIMARY KEY ("id")
      )
    `);

    // Create receipt_processing_jobs table
    await queryRunner.query(`
      CREATE TABLE "receipt_processing_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "receipt_id" uuid,
        "status" character varying NOT NULL DEFAULT 'pending',
        "progress" integer NOT NULL DEFAULT 0,
        "payload" jsonb NOT NULL,
        "result" jsonb,
        "error" text,
        "locked_at" TIMESTAMP,
        "locked_by" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receipt_processing_jobs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_receipts_user_id" ON "receipts" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_receipts_status" ON "receipts" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_receipts_gmail_message_id" ON "receipts" ("gmail_message_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_receipts_received_at" ON "receipts" ("received_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_receipt_processing_jobs_status" ON "receipt_processing_jobs" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_receipt_processing_jobs_locked_at" ON "receipt_processing_jobs" ("locked_at")
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "gmail_settings"
      ADD CONSTRAINT "FK_gmail_settings_integration"
      FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "gmail_watch_subscriptions"
      ADD CONSTRAINT "FK_gmail_watch_subscriptions_integration"
      FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ADD CONSTRAINT "FK_receipts_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ADD CONSTRAINT "FK_receipts_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "receipts"
      ADD CONSTRAINT "FK_receipts_transaction"
      FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_transaction"
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_workspace"
    `);
    await queryRunner.query(`
      ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "gmail_watch_subscriptions" DROP CONSTRAINT "FK_gmail_watch_subscriptions_integration"
    `);
    await queryRunner.query(`
      ALTER TABLE "gmail_settings" DROP CONSTRAINT "FK_gmail_settings_integration"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_receipt_processing_jobs_locked_at"`);
    await queryRunner.query(`DROP INDEX "IDX_receipt_processing_jobs_status"`);
    await queryRunner.query(`DROP INDEX "IDX_receipts_received_at"`);
    await queryRunner.query(`DROP INDEX "IDX_receipts_gmail_message_id"`);
    await queryRunner.query(`DROP INDEX "IDX_receipts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_receipts_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "receipt_processing_jobs"`);
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP TABLE "gmail_watch_subscriptions"`);
    await queryRunner.query(`DROP TABLE "gmail_settings"`);
    // Drop gmail_watch_subscription_status_enum and receipts_status_enum
    await queryRunner.query(`DROP TYPE IF EXISTS "gmail_watch_subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "receipts_status_enum"`);
  }
}
