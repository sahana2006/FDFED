import { MigrationInterface, QueryRunner } from 'typeorm';

export class BranchAdminRelation1720000000009 implements MigrationInterface {
  name = 'BranchAdminRelation1720000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_admins" (
        "userId" varchar(20) NOT NULL,
        "branchId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY ("userId"),
        CONSTRAINT "FK_branch_admins_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "branch_admins"');
  }
}
