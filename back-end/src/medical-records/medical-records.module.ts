import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { PatientsModule } from '../patients/patients.module';
import { FollowUpsController } from './followups.controller';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [
    CommonModule,
    AppointmentsModule,
    PatientsModule,
    DoctorsModule,
    LabRequestsModule,
  ],
  controllers: [MedicalRecordsController, FollowUpsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}




