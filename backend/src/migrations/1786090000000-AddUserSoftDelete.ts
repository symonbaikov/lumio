import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `users` had no delete-date column, so `userRepository.softDelete()` threw
 * MissingDeleteDateColumnError — the admin "delete user" endpoint could never
 * have worked. This is the column it always assumed existed.
 */
export class AddUserSoftDelete1786090000000 implements MigrationInterface {
  name = 'AddUserSoftDelete1786090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz
    `);

    // Every lookup for a live user filters on this, and it is highly selective.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_deleted_at"
        ON "users" ("deleted_at")
        WHERE "deleted_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
