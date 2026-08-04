import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionCharges1778200000001 implements MigrationInterface {
  name = 'CreateSubscriptionCharges1778200000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "subscription_charges_match_status_enum" AS ENUM ('matched', 'price_changed', 'date_shifted')`);
    await queryRunner.query(`
      CREATE TABLE "subscription_charges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" varchar(10) NOT NULL,
        "charge_date" date NOT NULL,
        "expected_amount" numeric(15,2) NOT NULL,
        "expected_date" date,
        "match_status" "subscription_charges_match_status_enum" NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_charges" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_charges_transaction" UNIQUE ("transaction_id"),
        CONSTRAINT "FK_subscription_charges_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_charges_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_charges_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_subscription_charges_subscription_date" ON "subscription_charges" ("subscription_id", "charge_date")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_charges"`);
    await queryRunner.query(`DROP TYPE "subscription_charges_match_status_enum"`);
  }
}
