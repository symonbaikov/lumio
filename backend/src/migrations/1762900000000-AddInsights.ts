import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsights1762900000000 implements MigrationInterface {
  name = 'AddInsights1762900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "insights" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "workspace_id" uuid,
        "type" character varying(64) NOT NULL,
        "category" character varying(32) NOT NULL,
        "severity" character varying(16) NOT NULL DEFAULT 'info',
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "actions" jsonb,
        "is_dismissed" boolean NOT NULL DEFAULT false,
        "is_actioned" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "deduplication_key" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "insights"
      ADD CONSTRAINT "FK_insights_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "insights"
      ADD CONSTRAINT "FK_insights_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_insights_user_active_created"
      ON "insights" ("user_id", "is_dismissed", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_insights_workspace_created"
      ON "insights" ("workspace_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_insights_expires_at"
      ON "insights" ("expires_at")
      WHERE "expires_at" IS NOT NULL AND "is_dismissed" = false
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_insights_user_dedup_active"
      ON "insights" ("user_id", "deduplication_key")
      WHERE "is_dismissed" = false AND "deduplication_key" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
      ADD COLUMN "smart_insights" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
      DROP COLUMN IF EXISTS "smart_insights"
    `);

    await queryRunner.query('DROP TABLE IF EXISTS "insights"');
  }
}
