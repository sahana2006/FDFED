import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces the branch persistence foundation without dropping or rewriting
 * the pre-existing SQLite file. Subsequent migrations add branch columns to
 * each converted operational table.
 */
export class BranchPersistenceBaseline1720000000000 implements MigrationInterface {
  name = 'BranchPersistenceBaseline1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hospital_branches" (
        "id" varchar PRIMARY KEY NOT NULL,
        "hospitalName" varchar(150) NOT NULL,
        "branchName" varchar(150) NOT NULL,
        "address" text NOT NULL,
        "city" varchar(100) NOT NULL,
        "state" varchar(100) NOT NULL,
        "pincode" varchar(10) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "email" varchar(254) NOT NULL UNIQUE,
        "status" varchar(20) NOT NULL DEFAULT ('active'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      INSERT OR IGNORE INTO "hospital_branches"
        ("id", "hospitalName", "branchName", "address", "city", "state", "pincode", "phone", "email", "status")
      VALUES
        ('00000000-0000-4000-8000-000000000001', 'Apollo', 'Apollo Main Branch', 'Legacy data migration branch', 'Hyderabad', 'Telangana', '500001', '+919000000000', 'main.branch@apollo.local', 'active')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lab_technicians" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(150) NOT NULL,
        "email" varchar(254) NOT NULL UNIQUE,
        "password" varchar(255) NOT NULL,
        "branchId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_lab_technicians_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "lab_technicians"');
    // hospital_branches is intentionally retained: it may contain user-created branches.
  }
}
