import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Switches the column-level default currency from 'KZT' to 'USD'.
 * Only the DEFAULT changes — existing rows keep their stored currency.
 */
const TABLES_WITH_CURRENCY = [
  'transactions',
  'statements',
  'wallets',
  'payables',
  'budgets',
  'data_entries',
  'balance_snapshots',
  // Created with a 'KZT' default even though the entity already declared 'USD'.
  'subscriptions',
];

export class SetDefaultCurrencyToUsd1778200000000 implements MigrationInterface {
  name = 'SetDefaultCurrencyToUsd1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_WITH_CURRENCY) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "currency" SET DEFAULT 'USD'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_WITH_CURRENCY) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "currency" SET DEFAULT 'KZT'
      `);
    }
  }
}
