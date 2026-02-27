import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayableToAuditEntityTypeEnum1763200000000 implements MigrationInterface {
  name = 'AddPayableToAuditEntityTypeEnum1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "entity_type_enum" ADD VALUE IF NOT EXISTS 'payable'`,
    );
  }

  public async down(): Promise<void> {
    // Enum value removal is not supported safely.
  }
}
