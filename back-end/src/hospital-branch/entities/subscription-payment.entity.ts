import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { HospitalBranch, PlanTier } from './hospital-branch.entity';

@Entity({ name: 'subscription_payments' })
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 20 })
  planTier!: PlanTier;

  @CreateDateColumn()
  paymentDate!: Date;
}
