import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportHistory1763300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "report_history" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "template_id" VARCHAR NOT NULL,
        "template_name" VARCHAR NOT NULL,
        "date_from" VARCHAR NOT NULL,
        "date_to" VARCHAR NOT NULL,
        "format" VARCHAR NOT NULL,
        "file_path" VARCHAR NULL,
        "file_name" VARCHAR NULL,
        "file_size" INT NOT NULL DEFAULT 0,
        "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_report_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_report_history_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_report_history_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "report_history"`);
  }
}
