import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'feedback' })
export class FeedbackEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  doctorId!: string;

  @Column({ type: 'varchar', length: 10 })
  rating!: string;

  @Column({ type: 'text' })
  comment!: string;

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
