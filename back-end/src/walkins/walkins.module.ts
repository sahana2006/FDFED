import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { WalkInsController } from './walkins.controller';
import { WalkInsService } from './walkins.service';

@Module({
  imports: [PatientsModule],
  controllers: [WalkInsController],
  providers: [WalkInsService],
})
export class WalkInsModule {}
