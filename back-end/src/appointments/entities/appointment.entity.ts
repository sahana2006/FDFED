import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'appointments' })
export class AppointmentEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  doctorId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @Column({ type: 'varchar', length: 20 })
  date!: string;

  @Column({ type: 'varchar', length: 20 })
  slot!: string;

  @Column({ type: 'varchar', length: 20, default: 'upcoming' })
  status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bookedBy?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  frontdeskId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
