import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestBookingDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'TEST001' })
  @IsString()
  @IsNotEmpty()
  labTestId!: string;
}

export class CreateLabAssignmentDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  patientName!: string;

  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString()
  @IsNotEmpty()
  doctorName!: string;

  @ApiPropertyOptional({ example: 'Basic Health Checkup' })
  @IsString()
  @IsOptional()
  packageName?: string;

  @ApiPropertyOptional({ example: ['Complete Blood Count'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tests?: string[];

  @ApiPropertyOptional({ example: 'Fasting required' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateLabAssignmentDto {
  @ApiPropertyOptional({ example: 'PAT001' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  patientName?: string;

  @ApiPropertyOptional({ example: 'Basic Health Checkup' })
  @IsString()
  @IsOptional()
  packageName?: string;

  @ApiPropertyOptional({ example: ['Complete Blood Count'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tests?: string[];

  @ApiPropertyOptional({ example: 'Fasting required' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

