import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
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
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
