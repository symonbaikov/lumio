import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessions1762500000000 implements MigrationInterface {
  name = 'AddAuthSessions1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" character varying(128) NOT NULL,
        "user_agent" text,
        "ip_address" character varying(45),
        "device" character varying(64) NOT NULL DEFAULT 'Unknown device',
        "browser" character varying(64) NOT NULL DEFAULT 'Unknown browser',
        "os" character varying(64) NOT NULL DEFAULT 'Unknown OS',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP NOT NULL DEFAULT now(),
        "revoked_at" TIMESTAMP,
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "FK_auth_sessions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_auth_sessions_refresh_token_hash"
      ON "auth_sessions" ("refresh_token_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_user_id"
      ON "auth_sessions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_user_revoked_at"
      ON "auth_sessions" ("user_id", "revoked_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "auth_sessions"');
  }
}
