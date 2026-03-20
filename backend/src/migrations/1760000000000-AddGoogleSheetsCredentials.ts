import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleSheetsCredentials1760000000000 implements MigrationInterface {
  name = 'AddGoogleSheetsCredentials1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_sheets_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "workspace_id" uuid,
        "access_token" text NOT NULL,
        "refresh_token" text NOT NULL,
        "email" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_sheets_credentials_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_google_sheets_credentials_user_workspace"
      ON "google_sheets_credentials" ("user_id", "workspace_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "google_sheets_credentials"
      ADD CONSTRAINT "FK_google_sheets_credentials_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "google_sheets_credentials"
      ADD CONSTRAINT "FK_google_sheets_credentials_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      INSERT INTO "google_sheets_credentials" (
        "user_id",
        "workspace_id",
        "access_token",
        "refresh_token",
        "created_at",
        "updated_at"
      )
      SELECT DISTINCT ON ("user_id", "workspace_id")
        "user_id",
        "workspace_id",
        "access_token",
        "refresh_token",
        now(),
        now()
      FROM "google_sheets"
      WHERE "refresh_token" IS NOT NULL
        AND "refresh_token" <> ''
      ORDER BY "user_id", "workspace_id", "updated_at" DESC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "google_sheets_credentials"
      DROP CONSTRAINT IF EXISTS "FK_google_sheets_credentials_workspace"
    `);
    await queryRunner.query(`
      ALTER TABLE "google_sheets_credentials"
      DROP CONSTRAINT IF EXISTS "FK_google_sheets_credentials_user"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_google_sheets_credentials_user_workspace"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "google_sheets_credentials"`);
  }
}
