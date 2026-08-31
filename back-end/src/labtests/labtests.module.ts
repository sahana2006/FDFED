import { Module } from '@nestjs/common';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { LabTestsController } from './labtests.controller';
import { LabTestsService } from './labtests.service';

@Module({
  imports: [LabRequestsModule],
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
