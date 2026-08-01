import { MigrationInterface, QueryRunner } from 'typeorm';

export class BranchAdminContactAndUniqueBranch1720000000010 implements MigrationInterface {
  name = 'BranchAdminContactAndUniqueBranch1720000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branch_admins" ADD COLUMN "name" varchar(150) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE "branch_admins" ADD COLUMN "email" varchar(254) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE "branch_admins" ADD COLUMN "phone" varchar(20) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_branch_admins_branchId" ON "branch_admins" ("branchId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_branch_admins_branchId"`);
  }
}
