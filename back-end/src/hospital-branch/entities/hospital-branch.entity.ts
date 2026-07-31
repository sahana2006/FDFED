import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum HospitalBranchStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity({ name: 'hospital_branches' })
export class HospitalBranch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  hospitalName!: string;

  @Column({ length: 150 })
  branchName!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ length: 100 })
  state!: string;

  @Column({ length: 10 })
  pincode!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 254, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, default: HospitalBranchStatus.ACTIVE })
  status!: HospitalBranchStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
