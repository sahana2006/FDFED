import { Module } from '@nestjs/common';
import { LabTestsController } from './labtests.controller';
import { LabTestsService } from './labtests.service';

@Module({
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
