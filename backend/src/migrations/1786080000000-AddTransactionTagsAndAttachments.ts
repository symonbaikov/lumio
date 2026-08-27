import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives a transaction a second axis of classification (tags, reusing the
 * workspace's existing tag vocabulary) and a place to pin supporting files.
 */
export class AddTransactionTagsAndAttachments1786080000000 implements MigrationInterface {
  name = 'AddTransactionTagsAndAttachments1786080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transaction_tags" (
        "transaction_id" uuid NOT NULL REFERENCES "transactions" ("id") ON DELETE CASCADE,
        "tag_id" uuid NOT NULL REFERENCES "tags" ("id") ON DELETE CASCADE,
        CONSTRAINT "PK_transaction_tags" PRIMARY KEY ("transaction_id", "tag_id")
      )
    `);
    // The primary key already covers lookups by transaction; this covers the
    // reverse question, "which transactions carry this tag".
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_tags_tag" ON "transaction_tags" ("tag_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "transaction_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "transaction_id" uuid NOT NULL REFERENCES "transactions" ("id") ON DELETE CASCADE,
        "uploaded_by_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "file_name" character varying(255) NOT NULL,
        "stored_file_name" character varying(255) NOT NULL,
        "mime_type" character varying(127) NOT NULL,
        "file_size" bigint NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_attachments_workspace_transaction"
      ON "transaction_attachments" ("workspace_id", "transaction_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_transaction_attachments_workspace_transaction"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "transaction_attachments"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_transaction_tags_tag"');
    await queryRunner.query('DROP TABLE IF EXISTS "transaction_tags"');
  }
}
