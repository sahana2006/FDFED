import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'lab_technicians' })
export class LabTechnician {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 254, unique: true })
  email!: string;

  // Existing authentication is password-based; a hash can replace this column
  // when the application moves to a credential provider.
  @Column({ length: 255 })
  password!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
