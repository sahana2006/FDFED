import { MigrationInterface, QueryRunner } from 'typeorm';

export class QueueBranchRelation1720000000007 implements MigrationInterface {
  name = 'QueueBranchRelation1720000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "queue_entries" (
        "id" varchar(30) PRIMARY KEY NOT NULL,
        "doctorId" varchar(20) NOT NULL,
        "userId" varchar(20) NOT NULL,
        "tokenNumber" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT ('waiting'),
        "branchId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_queue_entries_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "queue_entries"');
  }
}
