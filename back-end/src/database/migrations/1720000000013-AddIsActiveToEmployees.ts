import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToEmployees1720000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "doctors" ADD COLUMN "isActive" boolean NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "frontdesks" ADD COLUMN "isActive" boolean NOT NULL DEFAULT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN out of the box in older versions, 
    // but in newer versions it does. However, typeorm migrations down is rarely used in this context.
    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "frontdesks" DROP COLUMN "isActive"`);
  }
}
