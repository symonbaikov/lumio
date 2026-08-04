import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionManagement1778200000000 implements MigrationInterface {
  name = 'AddSubscriptionManagement1778200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "subscriptions_review_status_enum" AS ENUM ('current', 'needs_review')`);
    await queryRunner.query(`CREATE TYPE "subscriptions_risk_status_enum" AS ENUM ('none', 'price_changed', 'date_shifted', 'missing_charge')`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "owner_id" uuid`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "review_at" date`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "review_status" "subscriptions_review_status_enum" NOT NULL DEFAULT 'current'`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "risk_status" "subscriptions_risk_status_enum" NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "cancellation_reason" text`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "realized_annual_savings" numeric(15,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_workspace_owner" ON "subscriptions" ("workspace_id", "owner_id")`);

    await queryRunner.query(`CREATE TYPE "subscription_decisions_decision_enum" AS ENUM ('owner_assigned', 'keep', 'review', 'cancelled', 'price_reduced')`);
    await queryRunner.query(`
      CREATE TABLE "subscription_decisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "actor_id" uuid,
        "decision" "subscription_decisions_decision_enum" NOT NULL,
        "owner_id" uuid,
        "note" text,
        "savings_amount" numeric(15,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscription_decisions_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_decisions_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_decisions_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_subscription_decisions_subscription_created" ON "subscription_decisions" ("subscription_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscription_decisions_workspace_created" ON "subscription_decisions" ("workspace_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_decisions"`);
    await queryRunner.query(`DROP TYPE "subscription_decisions_decision_enum"`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_workspace_owner"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_owner"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "realized_annual_savings"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "cancellation_reason"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "risk_status"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "review_status"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "review_at"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "owner_id"`);
    await queryRunner.query(`DROP TYPE "subscriptions_risk_status_enum"`);
    await queryRunner.query(`DROP TYPE "subscriptions_review_status_enum"`);
  }
}
