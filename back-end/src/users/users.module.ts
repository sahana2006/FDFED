import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from '../patients/patients.module';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PatientsModule, TypeOrmModule.forFeature([LabTechnician])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
