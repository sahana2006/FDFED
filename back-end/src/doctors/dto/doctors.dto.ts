import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty({ example: 'Dr. John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'john.doe@medbits.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @ApiPropertyOptional({ example: ['09:00 AM', '10:00 AM'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  slots?: string[];

  @ApiPropertyOptional({ example: 'Cardiology Dept' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'MD' })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'LIC12345' })
  @IsString()
  @IsOptional()
  licenseNo?: string;

  @ApiPropertyOptional({ example: 'Expert cardiologist.' })
  @IsString()
  @IsOptional()
  bio?: string;
}

export class UpdateDoctorDto {
  @ApiPropertyOptional({ example: 'Dr. John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@medbits.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({ example: ['09:00 AM', '10:00 AM'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  slots?: string[];

  @ApiPropertyOptional({ example: 'Cardiology Dept' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'MD' })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'LIC12345' })
  @IsString()
  @IsOptional()
  licenseNo?: string;

  @ApiPropertyOptional({ example: 'Expert cardiologist.' })
  @IsString()
  @IsOptional()
  bio?: string;
}

export class CreateSlotBlockDto {
  @ApiProperty({ example: '2026-05-10', description: 'ISO date YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ example: '10:00', description: 'Time slot in HH:MM (24-hour)' })
  @IsString()
  @IsNotEmpty()
  slot!: string;

  @ApiPropertyOptional({ example: 'Personal leave', description: 'Optional reason for blocking' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class MarkUnavailableDateDto {
  @ApiProperty({ example: '2026-05-15', description: 'ISO date YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  date!: string;
}
