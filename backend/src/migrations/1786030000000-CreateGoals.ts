import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoals1786030000000 implements MigrationInterface {
  name = 'CreateGoals1786030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "goals" (
        "id"            uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"  uuid          NOT NULL,
        "name"          varchar(150)  NOT NULL,
        "target_amount" numeric(15,2) NOT NULL,
        "currency"      varchar       NOT NULL DEFAULT 'KZT',
        "target_date"   date,
        "created_by_id" uuid,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        CONSTRAINT "PK_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_goals_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_goals_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_goals_workspace_created" ON "goals" ("workspace_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "goal_contributions" (
        "id"                uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "goal_id"           uuid          NOT NULL,
        "workspace_id"      uuid          NOT NULL,
        "amount"            numeric(15,2) NOT NULL,
        "contribution_date" date          NOT NULL,
        "note"              varchar(200),
        "created_by_id"     uuid,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_goal_contributions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_goal_contributions_goal" FOREIGN KEY ("goal_id")
          REFERENCES "goals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_goal_contributions_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_goal_contributions_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_goal_contributions_goal_date"
        ON "goal_contributions" ("goal_id", "contribution_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_goal_contributions_goal_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goal_contributions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_goals_workspace_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goals"`);
  }
}
