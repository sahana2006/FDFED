import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FrontdeskModule } from './frontdesk/frontdesk.module';
import { LabTestsModule } from './labtests/labtests.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { MedicinesModule } from './medicines/medicines.module';
import { OrdersModule } from './orders/orders.module';
import { PatientsModule } from './patients/patients.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';
import { WalkInsModule } from './walkins/walkins.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    PatientsModule,
    MedicinesModule,
    OrdersModule,
    LabTestsModule,
    MedicalRecordsModule,
    DoctorsModule,
    AppointmentsModule,
    QueueModule,
    FeedbackModule,
    FrontdeskModule,
    WalkInsModule,
    LeaveRequestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
