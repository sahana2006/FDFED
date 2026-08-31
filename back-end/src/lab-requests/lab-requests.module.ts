import { MiddlewareConsumer, Module, NestModule, RequestMethod, forwardRef } from '@nestjs/common';
import { LabTechniciansModule } from '../lab-technicians/lab-technicians.module';
import { LabRequestsController } from './lab-requests.controller';
import { LabReportsController } from './lab-reports.controller';
import { LabReportUploadMiddleware } from './middleware/lab-report-upload.middleware';
import { LabRequestsService } from './lab-requests.service';

@Module({
  imports: [forwardRef(() => LabTechniciansModule)],
  controllers: [LabRequestsController, LabReportsController],
  providers: [LabRequestsService, LabReportUploadMiddleware],
  exports: [LabRequestsService],
})
export class LabRequestsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LabReportUploadMiddleware)
      .forRoutes({ path: 'lab-requests/:id/report/upload', method: RequestMethod.POST });
  }
}
