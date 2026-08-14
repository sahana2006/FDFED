import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePatientBranchRelation1720000000014 implements MigrationInterface {
  name = 'RemovePatientBranchRelation1720000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients_new" (
        "userId" varchar(20) PRIMARY KEY NOT NULL,
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "dob" varchar(20) NOT NULL,
        "gender" varchar(20) NOT NULL,
        "bloodGroup" varchar(10) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "email" varchar(254) NOT NULL,
        "guardianName" varchar(150) NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO "patients_new" (
        "userId",
        "firstName",
        "lastName",
        "dob",
        "gender",
        "bloodGroup",
        "phone",
        "email",
        "guardianName",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "userId",
        "firstName",
        "lastName",
        "dob",
        "gender",
        "bloodGroup",
        "phone",
        "email",
        "guardianName",
        "createdAt",
        "updatedAt"
      FROM "patients"
    `);

    await queryRunner.query('DROP TABLE "patients"');
    await queryRunner.query('ALTER TABLE "patients_new" RENAME TO "patients"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients_old" (
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

    await queryRunner.query(`
      INSERT INTO "patients_old" (
        "userId",
        "branchId",
        "firstName",
        "lastName",
        "dob",
        "gender",
        "bloodGroup",
        "phone",
        "email",
        "guardianName",
        "createdAt",
        "updatedAt"
      )
      SELECT
        "userId",
        '00000000-0000-4000-8000-000000000001',
        "firstName",
        "lastName",
        "dob",
        "gender",
        "bloodGroup",
        "phone",
        "email",
        "guardianName",
        "createdAt",
        "updatedAt"
      FROM "patients"
    `);

    await queryRunner.query('DROP TABLE "patients"');
    await queryRunner.query('ALTER TABLE "patients_old" RENAME TO "patients"');
  }
}
