import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackEntity } from './entities/feedback.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackEntity]), AppointmentsModule, DoctorsModule, HospitalBranchModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
