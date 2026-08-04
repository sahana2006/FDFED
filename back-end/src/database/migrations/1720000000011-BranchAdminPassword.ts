import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class BranchAdminPassword1720000000011 implements MigrationInterface {
  name = 'BranchAdminPassword1720000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branch_admins');
    const passwordColumn = table?.findColumnByName('password');
    if (passwordColumn) {
      return;
    }

    await queryRunner.addColumn(
      'branch_admins',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "''",
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branch_admins');
    const passwordColumn = table?.findColumnByName('password');
    if (!passwordColumn) {
      return;
    }

    await queryRunner.dropColumn('branch_admins', 'password');
  }
}
