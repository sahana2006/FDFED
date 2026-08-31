import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AppointmentEntity } from '../appointments/entities/appointment.entity';
import { DoctorEntity } from '../doctors/entities/doctor.entity';
import { FrontdeskEntity } from '../frontdesk/entities/frontdesk.entity';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { LabTestsModule } from '../labtests/labtests.module';
import { PatientsModule } from '../patients/patients.module';
import { HospitalBranchController } from './hospital-branch.controller';
import { SuperAdminHospitalBranchController } from './super-admin-hospital-branch.controller';
import { HospitalBranchService } from './hospital-branch.service';
import { HospitalBranch } from './entities/hospital-branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HospitalBranch, DoctorEntity, FrontdeskEntity, LabTechnician, AppointmentEntity]),
    PatientsModule,
    forwardRef(() => AppointmentsModule),
    forwardRef(() => LabRequestsModule),
    forwardRef(() => LabTestsModule),
  ],
  controllers: [HospitalBranchController, SuperAdminHospitalBranchController],
  providers: [HospitalBranchService],
  exports: [HospitalBranchService],
})
export class HospitalBranchModule {}
