import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chat mode: tool turns are persisted alongside user/assistant messages.
 * The enum is recreated via a varchar hop because ALTER TYPE ... ADD VALUE
 * cannot run inside the transaction TypeORM wraps migrations in.
 */
export class AddToolRoleToAiChatMessages1786020000000 implements MigrationInterface {
  name = 'AddToolRoleToAiChatMessages1786020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages" ALTER COLUMN "role" TYPE varchar
    `);
    await queryRunner.query(`DROP TYPE "ai_chat_role_enum"`);
    await queryRunner.query(`
      CREATE TYPE "ai_chat_role_enum" AS ENUM ('user', 'assistant', 'tool')
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
        ALTER COLUMN "role" TYPE ai_chat_role_enum USING "role"::ai_chat_role_enum
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages" ADD COLUMN "action_payload" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages" DROP COLUMN IF EXISTS "action_payload"
    `);

    await queryRunner.query(`DELETE FROM "ai_chat_messages" WHERE "role" = 'tool'`);
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages" ALTER COLUMN "role" TYPE varchar
    `);
    await queryRunner.query(`DROP TYPE "ai_chat_role_enum"`);
    await queryRunner.query(`
      CREATE TYPE "ai_chat_role_enum" AS ENUM ('user', 'assistant')
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
        ALTER COLUMN "role" TYPE ai_chat_role_enum USING "role"::ai_chat_role_enum
    `);
  }
}
