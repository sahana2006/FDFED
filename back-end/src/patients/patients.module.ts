import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientEntity } from './entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PatientEntity]), CommonModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}





