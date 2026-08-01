import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsString()
  @IsNotEmpty()
  dob!: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({ example: 'O+' })
  @IsString()
  @IsNotEmpty()
  bloodGroup!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  guardianName?: string;
}

export class UpdatePatientProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  guardianName?: string;
}
