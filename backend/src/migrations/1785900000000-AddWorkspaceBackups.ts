import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceBackups1785900000000 implements MigrationInterface {
  name = 'AddWorkspaceBackups1785900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "backup_configurations" (
        "id"                 uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"       uuid         NOT NULL,
        "destination_kind"   varchar(16)  NOT NULL,
        "destination_path"   varchar(255) NOT NULL DEFAULT '',
        "daily_time"         varchar(5)   NOT NULL DEFAULT '03:00',
        "time_zone"          varchar(64)  NOT NULL DEFAULT 'UTC',
        "retention_count"    integer      NOT NULL DEFAULT 7,
        "enabled"            boolean      NOT NULL DEFAULT true,
        "encrypted_data_key" text         NOT NULL,
        "password_envelope"  jsonb        NOT NULL,
        "last_successful_at" timestamptz,
        "created_at"         timestamptz  NOT NULL DEFAULT now(),
        "updated_at"         timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_backup_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_backup_configurations_workspace" UNIQUE ("workspace_id"),
        CONSTRAINT "CHK_backup_configurations_destination" CHECK ("destination_kind" IN ('nextcloud', 'local')),
        CONSTRAINT "CHK_backup_configurations_retention" CHECK ("retention_count" >= 1),
        CONSTRAINT "FK_backup_configurations_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "backup_runs" (
        "id"               uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"     uuid         NOT NULL,
        "configuration_id" uuid         NOT NULL,
        "trigger"          varchar(16)  NOT NULL,
        "status"           varchar(16)  NOT NULL DEFAULT 'running',
        "destination_file" varchar(512),
        "payload_sha256"   varchar(64),
        "size_bytes"       bigint,
        "error_message"    text,
        "started_at"       timestamptz  NOT NULL,
        "finished_at"      timestamptz,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_backup_runs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_backup_runs_trigger" CHECK ("trigger" IN ('manual', 'scheduled')),
        CONSTRAINT "CHK_backup_runs_status" CHECK ("status" IN ('running', 'succeeded', 'failed')),
        CONSTRAINT "FK_backup_runs_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_backup_runs_configuration" FOREIGN KEY ("configuration_id")
          REFERENCES "backup_configurations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_backup_runs_workspace_created" ON "backup_runs" ("workspace_id", "created_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "backup_runs"');
    await queryRunner.query('DROP TABLE IF EXISTS "backup_configurations"');
  }
}
