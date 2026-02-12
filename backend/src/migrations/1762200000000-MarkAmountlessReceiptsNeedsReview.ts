import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkAmountlessReceiptsNeedsReview1762200000000 implements MigrationInterface {
  name = 'MarkAmountlessReceiptsNeedsReview1762200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "receipts"
      SET "status" = 'needs_review'
      WHERE (
        "parsed_data"->>'amount' IS NULL
        OR BTRIM("parsed_data"->>'amount') = ''
      )
      AND "status" IN ('new', 'parsed', 'draft')
    `);

    await queryRunner.query(`
      UPDATE "receipts"
      SET "parsed_data" = jsonb_set(
        COALESCE("parsed_data", '{}'::jsonb),
        '{validationIssues}',
        CASE
          WHEN COALESCE("parsed_data"->'validationIssues', '[]'::jsonb) @> '["missing_amount"]'::jsonb
            THEN COALESCE("parsed_data"->'validationIssues', '[]'::jsonb)
          ELSE COALESCE("parsed_data"->'validationIssues', '[]'::jsonb) || '["missing_amount"]'::jsonb
        END,
        true
      )
      WHERE (
        "parsed_data"->>'amount' IS NULL
        OR BTRIM("parsed_data"->>'amount') = ''
      )
      AND "status" = 'needs_review'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "receipts"
      SET "status" = 'draft'
      WHERE "status" = 'needs_review'
      AND (
        "parsed_data"->>'amount' IS NULL
        OR BTRIM("parsed_data"->>'amount') = ''
      )
    `);

    await queryRunner.query(`
      UPDATE "receipts"
      SET "parsed_data" = jsonb_set(
        COALESCE("parsed_data", '{}'::jsonb),
        '{validationIssues}',
        COALESCE(
          (
            SELECT jsonb_agg(issue)
            FROM jsonb_array_elements_text(COALESCE("parsed_data"->'validationIssues', '[]'::jsonb)) issue
            WHERE issue <> 'missing_amount'
          ),
          '[]'::jsonb
        ),
        true
      )
      WHERE COALESCE("parsed_data"->'validationIssues', '[]'::jsonb) @> '["missing_amount"]'::jsonb
    `);
  }
}
