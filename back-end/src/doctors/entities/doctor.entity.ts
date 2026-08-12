import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'doctors' })
export class DoctorEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  userId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 150 })
  specialization!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @Column({ length: 150 })
  department!: string;

  @Column({ length: 255, default: '' })
  qualification!: string;

  @Column({ type: 'int', default: 0 })
  experience!: number;

  @Column({ type: 'int', default: 0 })
  age!: number;

  @Column({ length: 20, default: '' })
  gender!: string;

  @Column({ length: 254 })
  email!: string;

  @Column({ length: 20, default: '' })
  phone!: string;

  @Column({ length: 50, default: '' })
  licenseNo!: string;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ type: 'simple-json' })
  slots!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
