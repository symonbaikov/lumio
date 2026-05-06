import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeys1777810000000 implements MigrationInterface {
  name = 'CreateApiKeys1777810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id"           uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid         NOT NULL,
        "user_id"      uuid         NOT NULL,
        "name"         varchar(255) NOT NULL,
        "key_hash"     varchar(64)  NOT NULL,
        "prefix"       varchar(8)   NOT NULL,
        "last_used_at" TIMESTAMPTZ,
        "expires_at"   TIMESTAMPTZ,
        "revoked_at"   TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_key_hash" UNIQUE ("key_hash"),
        CONSTRAINT "FK_api_keys_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_api_keys_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_key_hash" ON "api_keys" ("key_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_workspace_id" ON "api_keys" ("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
  }
}
