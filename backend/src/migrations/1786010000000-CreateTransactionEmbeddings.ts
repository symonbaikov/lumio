import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionEmbeddings1786010000000 implements MigrationInterface {
  name = 'CreateTransactionEmbeddings1786010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transaction_embeddings" (
        "id"             uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" uuid         NOT NULL,
        "workspace_id"   uuid         NOT NULL,
        "vector"         real[]       NOT NULL,
        "model_id"       varchar(128) NOT NULL,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_embeddings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transaction_embeddings_transaction" UNIQUE ("transaction_id"),
        CONSTRAINT "FK_transaction_embeddings_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transaction_embeddings_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_embeddings_workspace"
        ON "transaction_embeddings" ("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_embeddings_workspace"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_embeddings"`);
  }
}
