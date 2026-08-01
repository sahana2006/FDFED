import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientBranchRelation1720000000003 implements MigrationInterface {
  name = 'PatientBranchRelation1720000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "userId" varchar(20) PRIMARY KEY NOT NULL,
        "branchId" varchar NOT NULL,
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "dob" varchar(20) NOT NULL,
        "gender" varchar(20) NOT NULL,
        "bloodGroup" varchar(10) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "email" varchar(254) NOT NULL,
        "guardianName" varchar(150) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_patients_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "patients"');
  }
}
