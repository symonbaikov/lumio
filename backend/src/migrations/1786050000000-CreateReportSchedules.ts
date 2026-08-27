import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportSchedules1786050000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "report_schedules" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "template_id" VARCHAR NOT NULL,
        "format" VARCHAR NOT NULL,
        "cadence" VARCHAR NOT NULL,
        "recipients" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "wallet_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "category_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "group_by" VARCHAR NULL,
        "locale" VARCHAR NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_run_at" TIMESTAMP WITH TIME ZONE NULL,
        "next_run_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "last_error" TEXT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_report_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_report_schedules_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_report_schedules_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // The scheduler polls for due-and-active rows; this is the only hot query.
    await queryRunner.query(`
      CREATE INDEX "IDX_report_schedules_due"
        ON "report_schedules" ("next_run_at")
        WHERE "is_active" = true
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_report_schedules_workspace"
        ON "report_schedules" ("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_report_schedules_workspace"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_report_schedules_due"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_schedules"`);
  }
}
