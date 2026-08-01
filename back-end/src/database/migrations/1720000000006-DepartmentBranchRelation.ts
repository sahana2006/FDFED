import { MigrationInterface, QueryRunner } from 'typeorm';

export class DepartmentBranchRelation1720000000006 implements MigrationInterface {
  name = 'DepartmentBranchRelation1720000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" text NOT NULL DEFAULT (''),
        "branchId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_departments_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "departments"');
  }
}
