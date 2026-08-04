import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'branch_admins' })
@Index(['branchId'], { unique: true })
export class BranchAdminEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  password!: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  phone!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @CreateDateColumn()
  createdAt!: Date;
}



