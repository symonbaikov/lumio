import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategorySource1763500000000 implements MigrationInterface {
  name = 'AddCategorySource1763500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "categories" ADD COLUMN "source" character varying NOT NULL DEFAULT \'user\'',
    );

    await queryRunner.query(
      'UPDATE "categories" SET "source" = \'system\' WHERE "is_system" = true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "categories" DROP COLUMN "source"');
  }
}
