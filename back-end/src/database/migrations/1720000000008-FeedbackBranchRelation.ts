import { MigrationInterface, QueryRunner } from 'typeorm';

export class FeedbackBranchRelation1720000000008 implements MigrationInterface {
  name = 'FeedbackBranchRelation1720000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feedback" (
        "id" varchar(30) PRIMARY KEY NOT NULL,
        "userId" varchar(20) NOT NULL,
        "doctorId" varchar(20) NOT NULL,
        "rating" varchar(10) NOT NULL,
        "comment" text NOT NULL,
        "branchId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_feedback_branch" FOREIGN KEY ("branchId") REFERENCES "hospital_branches" ("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "feedback"');
  }
}
