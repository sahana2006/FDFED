import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { HospitalBranch } from '../../hospital-branch/entities/hospital-branch.entity';

@Entity({ name: 'frontdesks' })
export class FrontdeskEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  userId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => HospitalBranch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: HospitalBranch;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 254 })
  email!: string;

  @Column({ length: 20, default: '' })
  phone!: string;

  @Column({ length: 20, default: '' })
  gender!: string;

  @Column({ length: 20, default: '' })
  reportingManagerId!: string;

  @Column({ type: 'simple-json', default: '[]' })
  languages!: string[];

  @Column({ length: 20, default: '' })
  counter!: string;

  @Column({ length: 20, default: '' })
  shiftStart!: string;

  @Column({ length: 20, default: '' })
  shiftEnd!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
