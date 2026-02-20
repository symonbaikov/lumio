import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxRates1762600000000 implements MigrationInterface {
  name = 'AddTaxRates1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tax_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid,
        "name" character varying(120) NOT NULL,
        "rate" numeric(5,2) NOT NULL DEFAULT '0',
        "is_default" boolean NOT NULL DEFAULT false,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tax_rates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tax_rates"
      ADD CONSTRAINT "FK_tax_rates_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tax_rates_workspace_id"
      ON "tax_rates" ("workspace_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "tax_rate_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_tax_rate"
      FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_tax_rate_id"
      ON "transactions" ("tax_rate_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_transactions_tax_rate_id"');
    await queryRunner.query(
      'ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_tax_rate"',
    );
    await queryRunner.query('ALTER TABLE "transactions" DROP COLUMN IF EXISTS "tax_rate_id"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tax_rates_workspace_id"');
    await queryRunner.query(
      'ALTER TABLE "tax_rates" DROP CONSTRAINT IF EXISTS "FK_tax_rates_workspace"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "tax_rates"');
  }
}
