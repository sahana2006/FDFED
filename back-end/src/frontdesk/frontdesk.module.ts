import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalBranchModule } from '../hospital-branch/hospital-branch.module';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';
import { FrontdeskController } from './frontdesk.controller';
import { FrontdeskService } from './frontdesk.service';
import { FrontdeskEntity } from './entities/frontdesk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FrontdeskEntity]), HospitalBranchModule, UsersModule, CommonModule],
  controllers: [FrontdeskController],
  providers: [FrontdeskService],
  exports: [FrontdeskService],
})
export class FrontdeskModule {}


