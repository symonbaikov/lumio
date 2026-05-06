import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptions1777840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "subscription_frequency_enum" AS ENUM ('weekly', 'monthly', 'quarterly', 'annual')`,
    );
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM ('detected', 'active', 'paused', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "vendor_name" varchar(255) NOT NULL,
        "vendor_raw" varchar(255),
        "amount" decimal(15,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'KZT',
        "frequency" "subscription_frequency_enum" NOT NULL,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'detected',
        "confidence" decimal(3,2),
        "next_charge_date" date,
        "last_charge_date" date,
        "category_id" uuid,
        "detection_meta" jsonb,
        "created_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_subscriptions_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_subscriptions_workspace_vendor_frequency" UNIQUE ("workspace_id", "vendor_name", "frequency")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_workspace_status" ON "subscriptions" ("workspace_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_workspace_next_charge" ON "subscriptions" ("workspace_id", "next_charge_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TYPE "subscription_frequency_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum"`);
  }
}
