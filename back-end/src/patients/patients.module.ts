import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientEntity } from './entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PatientEntity]), HospitalBranchModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
