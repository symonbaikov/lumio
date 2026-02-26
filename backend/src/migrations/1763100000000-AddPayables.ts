import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayables1763100000000 implements MigrationInterface {
  name = 'AddPayables1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payables_status_enum" AS ENUM ('to_pay', 'scheduled', 'paid', 'overdue', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE "payables_source_enum" AS ENUM ('statement', 'invoice', 'manual')
    `);

    await queryRunner.query(`
      CREATE TABLE "payables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "created_by_id" uuid,
        "vendor" character varying(255) NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'KZT',
        "due_date" date,
        "status" "payables_status_enum" NOT NULL DEFAULT 'to_pay',
        "linked_transaction_id" uuid,
        "source" "payables_source_enum" NOT NULL DEFAULT 'manual',
        "is_recurring" boolean NOT NULL DEFAULT false,
        "comment" text,
        "statement_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_payables" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "payables"
      ADD CONSTRAINT "FK_payables_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "payables"
      ADD CONSTRAINT "FK_payables_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "payables"
      ADD CONSTRAINT "FK_payables_linked_transaction"
      FOREIGN KEY ("linked_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "payables"
      ADD CONSTRAINT "FK_payables_statement"
      FOREIGN KEY ("statement_id") REFERENCES "statements"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_status"
      ON "payables" ("workspace_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payables_workspace_due_date"
      ON "payables" ("workspace_id", "due_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payables_workspace_due_date"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payables_workspace_status"');
    await queryRunner.query('DROP TABLE IF EXISTS "payables"');
    await queryRunner.query('DROP TYPE IF EXISTS "payables_source_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "payables_status_enum"');
  }
}
