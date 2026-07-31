import { PartialType } from '@nestjs/swagger';
import { CreateHospitalBranchDto } from './create-hospital-branch.dto';

export class UpdateHospitalBranchDto extends PartialType(CreateHospitalBranchDto) {}
