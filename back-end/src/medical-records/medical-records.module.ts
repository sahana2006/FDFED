import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { PatientsModule } from '../patients/patients.module';
import { PatientAccessMiddleware } from '../common/patient-access.middleware';
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
  providers: [MedicalRecordsService, PatientAccessMiddleware],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Router middleware — only runs on medical record & follow-up routes
    consumer
      .apply(PatientAccessMiddleware)
      .forRoutes(MedicalRecordsController, FollowUpsController);
  }
}





