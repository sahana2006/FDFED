import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'queue_entries' })
export class QueueEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  doctorId!: string;

  @Column({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'int' })
  tokenNumber!: number;

  @Column({ type: 'varchar', length: 20, default: 'waiting' })
  status!: string;

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
