import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `needs_review` statement status.
 *
 * A statement whose balance does not reconcile
 * (balanceStart + credits - debits != balanceEnd) used to be marked `completed`,
 * so a parse that silently lost rows fed analytics as if it were valid. Such a
 * statement now lands in `needs_review`, which is deliberately absent from every
 * "approved statuses" list — it is excluded from dashboards and reports until a
 * user explicitly confirms the discrepancy.
 */
export class AddStatementNeedsReviewStatus1786050000000 implements MigrationInterface {
  name = 'AddStatementNeedsReviewStatus1786050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "statement_status_enum" ADD VALUE IF NOT EXISTS 'needs_review'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot remove enum values. Statements already in 'needs_review'
    // would need to be moved to 'completed' by hand before rolling back the code.
  }
}
