import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentBranchRelation1720000000005 implements MigrationInterface {
  name = 'AppointmentBranchRelation1720000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" varchar(20) PRIMARY KEY NOT NULL,
        "userId" varchar(20) NOT NULL,
        "doctorId" varchar(20) NOT NULL,
        "branchId" varchar NOT NULL,
        "date" varchar(20) NOT NULL,
        "slot" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT ('upcoming'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_appointments_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "appointments"');
  }
}
