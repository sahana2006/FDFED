import { MigrationInterface, QueryRunner } from 'typeorm';

export class FrontdeskBranchRelation1720000000004 implements MigrationInterface {
  name = 'FrontdeskBranchRelation1720000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "frontdesks" (
        "userId" varchar(20) PRIMARY KEY NOT NULL,
        "branchId" varchar NOT NULL,
        "name" varchar(150) NOT NULL,
        "email" varchar(254) NOT NULL,
        "phone" varchar(20) NOT NULL DEFAULT (''),
        "gender" varchar(20) NOT NULL DEFAULT (''),
        "reportingManagerId" varchar(20) NOT NULL DEFAULT (''),
        "languages" text NOT NULL DEFAULT ('[]'),
        "counter" varchar(20) NOT NULL DEFAULT (''),
        "shiftStart" varchar(20) NOT NULL DEFAULT (''),
        "shiftEnd" varchar(20) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_frontdesks_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "frontdesks"');
  }
}
