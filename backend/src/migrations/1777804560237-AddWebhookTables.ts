import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookTables1777804560237 implements MigrationInterface {
  name = 'AddWebhookTables1777804560237';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "webhook_endpoints" (
        "id"                uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"      uuid         NOT NULL,
        "name"              varchar(255) NOT NULL,
        "token"             varchar(64)  NOT NULL,
        "is_active"         boolean      NOT NULL DEFAULT true,
        "default_wallet_id" uuid,
        "default_branch_id" uuid,
        "created_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_endpoints" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_webhook_endpoints_token" UNIQUE ("token"),
        CONSTRAINT "FK_webhook_endpoints_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_endpoints_workspace" ON "webhook_endpoints" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "webhook_subscriptions" (
        "id"           uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid          NOT NULL,
        "name"         varchar(255)  NOT NULL,
        "url"          varchar(2048) NOT NULL,
        "secret"       varchar(255)  NOT NULL,
        "events"       text[]        NOT NULL DEFAULT '{}',
        "is_active"    boolean       NOT NULL DEFAULT true,
        "created_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhook_subscriptions_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_subscriptions_workspace"
        ON "webhook_subscriptions" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE TYPE "webhook_delivery_status_enum" AS ENUM (
        'pending','processing','success','failed','exhausted'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "webhook_deliveries" (
        "id"                 uuid                           NOT NULL DEFAULT uuid_generate_v4(),
        "subscription_id"    uuid                           NOT NULL,
        "event"              varchar(64)                    NOT NULL,
        "payload"            jsonb                          NOT NULL,
        "status"             "webhook_delivery_status_enum" NOT NULL DEFAULT 'pending',
        "attempt_count"      int                            NOT NULL DEFAULT 0,
        "max_attempts"       int                            NOT NULL DEFAULT 3,
        "next_attempt_at"    TIMESTAMP,
        "last_attempted_at"  TIMESTAMP,
        "last_response_code" int,
        "last_response_body" text,
        "last_error"         text,
        "locked_at"          TIMESTAMP,
        "locked_by"          varchar(128),
        "created_at"         TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhook_deliveries_subscription"
          FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_deliveries_status_next"
        ON "webhook_deliveries" ("status", "next_attempt_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_deliveries_subscription"
        ON "webhook_deliveries" ("subscription_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "webhook_delivery_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_endpoints"`);
  }
}
