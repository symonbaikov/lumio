import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCryptoWallets1786050000000 implements MigrationInterface {
  name = 'CreateCryptoWallets1786050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "crypto_wallets" (
        "id"                    uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id"          uuid         NOT NULL,
        "address"               varchar(42)  NOT NULL,
        "chain_id"              integer      NOT NULL DEFAULT 1,
        "label"                 varchar(100),
        "is_active"             boolean      NOT NULL DEFAULT true,
        "last_synced_at"        TIMESTAMPTZ,
        "last_sync_error"       text,
        "connected_by_user_id"  uuid,
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crypto_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_crypto_wallets_workspace_chain_address"
          UNIQUE ("workspace_id", "chain_id", "address"),
        CONSTRAINT "FK_crypto_wallets_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_crypto_wallets_connected_by" FOREIGN KEY ("connected_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "crypto_wallet_id" uuid,
        ADD COLUMN "crypto_asset"     varchar(20),
        ADD COLUMN "crypto_amount"    numeric(38,18),
        ADD COLUMN "crypto_tx_hash"   varchar(66)
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "FK_transactions_crypto_wallet" FOREIGN KEY ("crypto_wallet_id")
          REFERENCES "crypto_wallets"("id") ON DELETE CASCADE
    `);

    // Idempotency key for the chain sync — see the matching @Index on Transaction.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_transactions_crypto_tx" ON "transactions"
        ("workspace_id", "crypto_wallet_id", "crypto_tx_hash", "crypto_asset", "transaction_type")
        WHERE "crypto_tx_hash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_crypto_tx"`);
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_crypto_wallet"
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN IF EXISTS "crypto_tx_hash",
        DROP COLUMN IF EXISTS "crypto_amount",
        DROP COLUMN IF EXISTS "crypto_asset",
        DROP COLUMN IF EXISTS "crypto_wallet_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "crypto_wallets"`);
  }
}
