import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiChats1786000000000 implements MigrationInterface {
  name = 'CreateAiChats1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ai_chat_role_enum" AS ENUM ('user', 'assistant')
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_chats" (
        "id"            uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"  uuid         NOT NULL,
        "created_by_id" uuid,
        "title"         varchar(255) NOT NULL,
        "model_id"      varchar(128) NOT NULL,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        CONSTRAINT "PK_ai_chats" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_chats_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ai_chats_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_chats_workspace_updated"
        ON "ai_chats" ("workspace_id", "updated_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_chat_messages" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "chat_id"      uuid              NOT NULL,
        "workspace_id" uuid              NOT NULL,
        "role"         ai_chat_role_enum NOT NULL,
        "content"      text              NOT NULL,
        "created_at"   TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_chat_messages_chat" FOREIGN KEY ("chat_id")
          REFERENCES "ai_chats"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ai_chat_messages_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_chat_messages_chat_created"
        ON "ai_chat_messages" ("chat_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_chat_messages_chat_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_messages"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_chats_workspace_updated"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chats"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_chat_role_enum"`);
  }
}
