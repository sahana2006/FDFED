import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'patients' })
export class PatientEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Column({ length: 20 })
  dob!: string;

  @Column({ length: 20 })
  gender!: string;

  @Column({ length: 10 })
  bloodGroup!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 254 })
  email!: string;

  @Column({ length: 150, default: '' })
  guardianName!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
