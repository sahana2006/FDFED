import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from '../patients/patients.module';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { BranchAdminEntity } from './entities/branch-admin.entity';
import { UsersController } from './users.controller';
import { SuperAdminBranchAdminController } from './super-admin-branch-admin.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PatientsModule, HospitalBranchModule, TypeOrmModule.forFeature([LabTechnician, BranchAdminEntity])],
  controllers: [UsersController, SuperAdminBranchAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
