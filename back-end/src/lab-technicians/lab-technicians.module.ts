import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { LabTechniciansController } from './lab-technicians.controller';
import { LabTechniciansService } from './lab-technicians.service';
import { LabTechnician } from './entities/lab-technician.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LabTechnician]), CommonModule, HospitalBranchModule],
  controllers: [LabTechniciansController],
  providers: [LabTechniciansService],
  exports: [LabTechniciansService],
})
export class LabTechniciansModule {}
