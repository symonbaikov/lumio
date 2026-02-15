import type { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_BALANCE_ACCOUNTS } from '../modules/balance/balance-default-accounts';

export class AddBalanceSheetEntities1762400000000 implements MigrationInterface {
  name = 'AddBalanceSheetEntities1762400000000';

  private async seedWorkspaceAccounts(queryRunner: QueryRunner, workspaceId: string) {
    const accountIdsByCode = new Map<string, string>();

    for (const account of DEFAULT_BALANCE_ACCOUNTS) {
      const parentId = account.parentCode ? accountIdsByCode.get(account.parentCode) || null : null;

      const inserted = await queryRunner.query(
        `
          INSERT INTO "balance_accounts" (
            "workspace_id",
            "parent_id",
            "code",
            "name",
            "name_en",
            "name_kk",
            "account_type",
            "sub_type",
            "is_editable",
            "is_auto_computed",
            "auto_source",
            "position",
            "is_system",
            "is_expandable"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13, $14
          )
          RETURNING "id"
        `,
        [
          workspaceId,
          parentId,
          account.code,
          account.name,
          account.nameEn,
          account.nameKk,
          account.accountType,
          account.subType,
          account.isEditable ?? true,
          account.isAutoComputed ?? false,
          account.autoSource ?? null,
          account.position,
          true,
          account.isExpandable ?? false,
        ],
      );

      accountIdsByCode.set(account.code, inserted[0].id as string);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "balance_account_type_enum" AS ENUM ('asset', 'liability', 'equity')
    `);

    await queryRunner.query(`
      CREATE TYPE "balance_account_sub_type_enum" AS ENUM (
        'non_current_asset',
        'current_asset',
        'cash',
        'equity',
        'borrowed_capital'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "balance_auto_source_enum" AS ENUM (
        'wallets',
        'statements',
        'wallets_and_statements',
        'transactions'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "balance_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "parent_id" uuid,
        "code" character varying(80) NOT NULL,
        "name" character varying(255) NOT NULL,
        "name_en" character varying(255),
        "name_kk" character varying(255),
        "account_type" "balance_account_type_enum" NOT NULL,
        "sub_type" "balance_account_sub_type_enum" NOT NULL,
        "is_editable" boolean NOT NULL DEFAULT true,
        "is_auto_computed" boolean NOT NULL DEFAULT false,
        "auto_source" "balance_auto_source_enum",
        "position" integer NOT NULL DEFAULT 0,
        "is_system" boolean NOT NULL DEFAULT true,
        "is_expandable" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_balance_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_balance_accounts_workspace_code" UNIQUE ("workspace_id", "code")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "balance_accounts"
      ADD CONSTRAINT "FK_balance_accounts_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "balance_accounts"
      ADD CONSTRAINT "FK_balance_accounts_parent"
      FOREIGN KEY ("parent_id") REFERENCES "balance_accounts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_balance_accounts_workspace" ON "balance_accounts" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_balance_accounts_parent" ON "balance_accounts" ("parent_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "balance_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "snapshot_date" date NOT NULL,
        "amount" numeric(15, 2) NOT NULL DEFAULT 0,
        "currency" character varying NOT NULL DEFAULT 'KZT',
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_balance_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_balance_snapshots_workspace_account_date"
          UNIQUE ("workspace_id", "account_id", "snapshot_date")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "balance_snapshots"
      ADD CONSTRAINT "FK_balance_snapshots_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "balance_snapshots"
      ADD CONSTRAINT "FK_balance_snapshots_account"
      FOREIGN KEY ("account_id") REFERENCES "balance_accounts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "balance_snapshots"
      ADD CONSTRAINT "FK_balance_snapshots_created_by"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_balance_snapshots_workspace" ON "balance_snapshots" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_balance_snapshots_account" ON "balance_snapshots" ("account_id")
    `);

    const workspaces: Array<{ id: string }> = await queryRunner.query(
      `SELECT "id" FROM "workspaces" ORDER BY "created_at" ASC`,
    );

    for (const workspace of workspaces) {
      await this.seedWorkspaceAccounts(queryRunner, workspace.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "balance_snapshots"');
    await queryRunner.query('DROP TABLE IF EXISTS "balance_accounts"');
    await queryRunner.query('DROP TYPE IF EXISTS "balance_auto_source_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "balance_account_sub_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "balance_account_type_enum"');
  }
}
