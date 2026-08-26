import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { CommonModule } from './common/common.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { LoggerMiddleware } from './common/logger.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { HospitalBranchModule } from './hospital-branch/hospital-branch.module';
import { LabTechniciansModule } from './lab-technicians/lab-technicians.module';
import { LabRequestsModule } from './lab-requests/lab-requests.module';
import { DepartmentsModule } from './departments/departments.module';
import { SuperAdminDashboardModule } from './super-admin-dashboard/super-admin-dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database:
        process.env.HOSPITAL_BRANCH_DB_PATH ?? 'data/hospital-branches.sqlite',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/database/migrations/*{.js,.ts}'],
    }),
    CommonModule,
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
    NotificationsModule,
    HospitalBranchModule,
    LabTechniciansModule,
    LabRequestsModule,
    DepartmentsModule,
    SuperAdminDashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestContextMiddleware,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
