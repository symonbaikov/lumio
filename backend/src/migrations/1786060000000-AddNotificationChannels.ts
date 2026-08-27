import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds per-channel delivery to notifications.
 *
 * The nine boolean columns stay in place: `channels` is backfilled from them so
 * nobody's настройки change meaning, and keeping them makes a rollback a code
 * revert instead of a data-recovery job.
 */
export class AddNotificationChannels1786060000000 implements MigrationInterface {
  name = 'AddNotificationChannels1786060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
        ADD COLUMN IF NOT EXISTS "channels" jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS "digest_mode" varchar(16) NOT NULL DEFAULT 'instant',
        ADD COLUMN IF NOT EXISTS "quiet_hours_start" smallint,
        ADD COLUMN IF NOT EXISTS "quiet_hours_end" smallint,
        ADD COLUMN IF NOT EXISTS "last_digest_at" timestamptz
    `);

    // Existing boolean = "show me this in the bell". Email and Telegram start off:
    // opting somebody into mail they never asked for is not a migration's call.
    await queryRunner.query(`
      UPDATE "notification_preferences"
      SET "channels" = jsonb_build_object(
        'statementUploaded', jsonb_build_object('inApp', "statement_uploaded", 'email', false, 'telegram', false),
        'importCommitted',   jsonb_build_object('inApp', "import_committed",   'email', false, 'telegram', false),
        'categoryChanges',   jsonb_build_object('inApp', "category_changes",   'email', false, 'telegram', false),
        'memberActivity',    jsonb_build_object('inApp', "member_activity",    'email', false, 'telegram', false),
        'dataDeleted',       jsonb_build_object('inApp', "data_deleted",       'email', false, 'telegram', false),
        'workspaceUpdated',  jsonb_build_object('inApp', "workspace_updated",  'email', false, 'telegram', false),
        'parsingErrors',     jsonb_build_object('inApp', "parsing_errors",     'email', false, 'telegram', false),
        'importFailures',    jsonb_build_object('inApp', "import_failures",    'email', false, 'telegram', false),
        'uncategorizedItems',jsonb_build_object('inApp', "uncategorized_items",'email', false, 'telegram', false)
      )
      WHERE "channels" = '{}'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "in_app" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "pending_channels" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // The digest sweep only ever looks for rows that still owe a delivery.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_pending_channels"
        ON "notifications" ("recipient_id")
        WHERE "pending_channels" <> '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_pending_channels"`);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "pending_channels",
        DROP COLUMN IF EXISTS "in_app"
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
        DROP COLUMN IF EXISTS "last_digest_at",
        DROP COLUMN IF EXISTS "quiet_hours_end",
        DROP COLUMN IF EXISTS "quiet_hours_start",
        DROP COLUMN IF EXISTS "digest_mode",
        DROP COLUMN IF EXISTS "channels"
    `);
  }
}
