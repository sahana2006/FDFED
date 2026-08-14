import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'patients' })
export class PatientEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  userId!: string;

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
