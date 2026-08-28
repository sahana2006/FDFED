import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalBranchController } from './hospital-branch.controller';
import { SuperAdminHospitalBranchController } from './super-admin-hospital-branch.controller';
import { HospitalBranchService } from './hospital-branch.service';
import { HospitalBranch } from './entities/hospital-branch.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HospitalBranch, SubscriptionPayment])],
  controllers: [HospitalBranchController, SuperAdminHospitalBranchController],
  providers: [HospitalBranchService],
  exports: [HospitalBranchService],
})
export class HospitalBranchModule {}
