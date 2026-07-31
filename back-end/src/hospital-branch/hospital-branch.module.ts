import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalBranchController } from './hospital-branch.controller';
import { HospitalBranchService } from './hospital-branch.service';
import { HospitalBranch } from './entities/hospital-branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HospitalBranch])],
  controllers: [HospitalBranchController],
  providers: [HospitalBranchService],
  exports: [HospitalBranchService],
})
export class HospitalBranchModule {}
