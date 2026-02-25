import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceAuditLogsWithAuditEvents1760000000000 implements MigrationInterface {
  name = 'ReplaceAuditLogsWithAuditEvents1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs"');
    await queryRunner.query('DROP TYPE IF EXISTS "audit_action_enum"');

    await queryRunner.query(
      "CREATE TYPE \"actor_type_enum\" AS ENUM ('user', 'system', 'integration')",
    );
    await queryRunner.query(
      "CREATE TYPE \"entity_type_enum\" AS ENUM ('transaction', 'statement', 'receipt', 'category', 'rule', 'workspace', 'integration', 'table_row', 'table_cell', 'branch', 'wallet', 'custom_table', 'custom_table_column')",
    );
    await queryRunner.query(
      "CREATE TYPE \"audit_action_enum\" AS ENUM ('create', 'update', 'delete', 'import', 'link', 'unlink', 'match', 'unmatch', 'apply_rule', 'rollback', 'export')",
    );
    await queryRunner.query("CREATE TYPE \"severity_enum\" AS ENUM ('info', 'warn', 'critical')");

    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actor_type" "actor_type_enum" NOT NULL,
        "actor_id" uuid,
        "actor_label" character varying(255) NOT NULL,
        "entity_type" "entity_type_enum" NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" "audit_action_enum" NOT NULL,
        "diff" jsonb,
        "meta" jsonb,
        "batch_id" uuid,
        "severity" "severity_enum" NOT NULL DEFAULT 'info',
        "is_undoable" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_events"
      ADD CONSTRAINT "FK_audit_events_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_events"
      ADD CONSTRAINT "FK_audit_events_actor"
      FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_audit_events_created_at" ON "audit_events" ("created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_audit_events_workspace_created_at" ON "audit_events" ("workspace_id", "created_at" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_audit_events_entity_created_at" ON "audit_events" ("entity_type", "entity_id", "created_at" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_audit_events_actor_created_at" ON "audit_events" ("actor_type", "actor_id", "created_at" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_audit_events_batch_id" ON "audit_events" ("batch_id") WHERE "batch_id" IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "audit_events"');
    await queryRunner.query('DROP TYPE IF EXISTS "severity_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "audit_action_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "entity_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "actor_type_enum"');

    await queryRunner.query(
      "CREATE TYPE \"audit_action_enum\" AS ENUM ('statement.upload', 'statement.delete', 'transaction.update', 'category.create', 'category.update', 'category.delete', 'branch.create', 'branch.update', 'branch.delete', 'wallet.create', 'wallet.update', 'wallet.delete', 'report.generate', 'custom_table.create', 'custom_table.update', 'custom_table.delete', 'custom_table_column.create', 'custom_table_column.update', 'custom_table_column.delete', 'custom_table_column.reorder', 'custom_table_row.create', 'custom_table_row.update', 'custom_table_row.delete', 'custom_table_row.batch_create')",
    );

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" "audit_action_enum" NOT NULL,
        "description" text,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "FK_audit_logs_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }
}
