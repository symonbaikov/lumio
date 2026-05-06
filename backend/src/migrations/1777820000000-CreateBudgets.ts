import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBudgets1777820000000 implements MigrationInterface {
  name = 'CreateBudgets1777820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "budget_period_type_enum" AS ENUM ('weekly', 'monthly', 'quarterly', 'annual')
    `);

    await queryRunner.query(`
      CREATE TABLE "budgets" (
        "id"                   uuid            NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"         uuid            NOT NULL,
        "category_id"          uuid            NOT NULL,
        "name"                 varchar(255)    NOT NULL,
        "limit_amount"         decimal(15,2)   NOT NULL,
        "currency"             varchar         NOT NULL DEFAULT 'KZT',
        "period_type"          budget_period_type_enum NOT NULL,
        "alert_at_80_sent"     boolean         NOT NULL DEFAULT false,
        "alert_at_100_sent"    boolean         NOT NULL DEFAULT false,
        "current_period_start" date            NOT NULL,
        "created_by_id"        uuid,
        "created_at"           TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budgets_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_budgets_category" FOREIGN KEY ("category_id")
          REFERENCES "categories"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_budgets_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_budgets_workspace_category_period"
          UNIQUE ("workspace_id", "category_id", "period_type")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_budgets_workspace_category"
        ON "budgets" ("workspace_id", "category_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "budgets"');
    await queryRunner.query('DROP TYPE IF EXISTS "budget_period_type_enum"');
  }
}
