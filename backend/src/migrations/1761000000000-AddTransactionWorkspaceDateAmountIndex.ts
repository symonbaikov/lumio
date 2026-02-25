import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionWorkspaceDateAmountIndex1761000000000 implements MigrationInterface {
  name = 'AddTransactionWorkspaceDateAmountIndex1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_transactions_workspace_date_amount" ON "transactions" ("workspace_id", "transaction_date", "amount")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_transactions_workspace_date_amount"');
  }
}
