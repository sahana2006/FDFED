import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { PatientAccessMiddleware } from '../common/patient-access.middleware';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientEntity } from './entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PatientEntity]), CommonModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientAccessMiddleware],
  exports: [PatientsService],
})
export class PatientsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Router middleware — only runs on routes served by PatientsController
    consumer
      .apply(PatientAccessMiddleware)
      .forRoutes(PatientsController);
  }
}





