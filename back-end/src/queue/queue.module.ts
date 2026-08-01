import { Module, forwardRef } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueEntity } from './entities/queue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QueueEntity]), forwardRef(() => DoctorsModule), PatientsModule, HospitalBranchModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
