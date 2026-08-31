import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { LabTestsModule } from '../labtests/labtests.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentEntity } from './entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentEntity]),
    CommonModule,
    forwardRef(() => DoctorsModule),
    PatientsModule,
    forwardRef(() => HospitalBranchModule),
    forwardRef(() => LabRequestsModule),
    forwardRef(() => LabTestsModule),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
