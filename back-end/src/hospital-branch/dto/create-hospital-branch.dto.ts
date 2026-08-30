import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { HospitalBranchStatus } from '../entities/hospital-branch.entity';

export class CreateHospitalBranchDto {
  @ApiProperty({ example: 'Medbits Hospitals' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  hospitalName!: string;

  @ApiProperty({ example: 'Banjara Hills' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  branchName!: string;

  @ApiProperty({ example: 'Road No. 12, Banjara Hills' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Hyderabad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Telangana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '500034' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit number' })
  pincode!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @ApiProperty({ example: 'banjarahills@medbits.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ enum: HospitalBranchStatus, default: HospitalBranchStatus.ACTIVE })
  @IsEnum(HospitalBranchStatus)
  @IsOptional()
  status?: HospitalBranchStatus;
}
