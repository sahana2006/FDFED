import { Module, forwardRef } from '@nestjs/common';
import { LabRequestsModule } from '../lab-requests/lab-requests.module';
import { LabTestsController } from './labtests.controller';
import { LabTestsService } from './labtests.service';

@Module({
  imports: [forwardRef(() => LabRequestsModule)],
  controllers: [LabTestsController],
  providers: [LabTestsService],
  exports: [LabTestsService],
})
export class LabTestsModule {}
