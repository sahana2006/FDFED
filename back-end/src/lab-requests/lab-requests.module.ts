import { Module } from '@nestjs/common';
import { LabTechniciansModule } from '../lab-technicians/lab-technicians.module';
import { LabRequestsController } from './lab-requests.controller';
import { LabReportsController } from './lab-reports.controller';
import { LabRequestsService } from './lab-requests.service';

@Module({
  imports: [LabTechniciansModule],
  controllers: [LabRequestsController, LabReportsController],
  providers: [LabRequestsService],
  exports: [LabRequestsService],
})
export class LabRequestsModule {}
