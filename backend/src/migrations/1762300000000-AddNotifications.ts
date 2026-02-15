import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1762300000000 implements MigrationInterface {
  name = 'AddNotifications1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipient_id" uuid NOT NULL,
        "workspace_id" uuid,
        "type" character varying(64) NOT NULL,
        "category" character varying(32) NOT NULL,
        "severity" character varying(16) NOT NULL DEFAULT 'info',
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "actor_id" uuid,
        "actor_name" character varying(255),
        "entity_type" character varying(64),
        "entity_id" uuid,
        "meta" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_recipient"
      FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_read"
      ON "notifications" ("recipient_id", "is_read", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_workspace_created"
      ON "notifications" ("workspace_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "statement_uploaded" boolean NOT NULL DEFAULT true,
        "import_committed" boolean NOT NULL DEFAULT true,
        "category_changes" boolean NOT NULL DEFAULT true,
        "member_activity" boolean NOT NULL DEFAULT true,
        "data_deleted" boolean NOT NULL DEFAULT true,
        "workspace_updated" boolean NOT NULL DEFAULT true,
        "parsing_errors" boolean NOT NULL DEFAULT true,
        "import_failures" boolean NOT NULL DEFAULT true,
        "uncategorized_items" boolean NOT NULL DEFAULT true,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences_user" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
      ADD CONSTRAINT "FK_notification_preferences_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "notification_preferences"');
    await queryRunner.query('DROP TABLE IF EXISTS "notifications"');
  }
}
