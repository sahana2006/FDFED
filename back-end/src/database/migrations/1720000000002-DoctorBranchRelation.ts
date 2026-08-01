import { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorBranchRelation1720000000002 implements MigrationInterface {
  name = 'DoctorBranchRelation1720000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctors" (
        "id" varchar(20) PRIMARY KEY NOT NULL,
        "userId" varchar(20) NOT NULL UNIQUE,
        "name" varchar(150) NOT NULL,
        "specialization" varchar(150) NOT NULL,
        "branchId" varchar NOT NULL,
        "department" varchar(150) NOT NULL,
        "qualification" varchar(255) NOT NULL DEFAULT ('') ,
        "experience" integer NOT NULL DEFAULT (0),
        "age" integer NOT NULL DEFAULT (0),
        "gender" varchar(20) NOT NULL DEFAULT ('') ,
        "email" varchar(254) NOT NULL,
        "phone" varchar(20) NOT NULL DEFAULT ('') ,
        "licenseNo" varchar(50) NOT NULL DEFAULT ('') ,
        "bio" text NOT NULL DEFAULT ('') ,
        "slots" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_doctors_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "doctors"');
  }
}
