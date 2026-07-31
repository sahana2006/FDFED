import { MigrationInterface, QueryRunner } from 'typeorm';

export class NameDefaultApolloBranch1720000000001 implements MigrationInterface {
  name = 'NameDefaultApolloBranch1720000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "hospital_branches"
      SET "hospitalName" = 'Apollo Main Branch', "branchName" = 'Main Branch'
      WHERE "id" = '00000000-0000-4000-8000-000000000001'
    `);
  }

  async down(): Promise<void> {}
}
