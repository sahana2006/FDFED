import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ example: 'consultation', enum: ['consultation', 'treatment', 'lab'] })
  @IsString()
  @IsIn(['consultation', 'treatment', 'lab'])
  @IsOptional()
  type?: 'consultation' | 'treatment' | 'lab';

  @ApiProperty({ example: 'Dr. Smith' })
  @IsString()
  @IsNotEmpty()
  doctorName!: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @ApiPropertyOptional({ example: '2026-05-10' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'Patient complains of chest pain.' })
  @IsString()
  @IsOptional()
  consultationNote?: string;

  @ApiPropertyOptional({ example: 'Aspirin 75mg' })
  @IsString()
  @IsOptional()
  medicines?: string;

  @ApiPropertyOptional({ example: 'Review after 1 week' })
  @IsString()
  @IsOptional()
  followUp?: string;

  @ApiPropertyOptional({ example: '2026-05-17' })
  @IsString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ example: 'APT001' })
  @IsString()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'ECG' })
  @IsString()
  @IsOptional()
  tests?: string;

  @ApiPropertyOptional({ example: 'Avoid spicy food' })
  @IsString()
  @IsOptional()
  lifestyle?: string;

  @ApiPropertyOptional({ example: 'Low sodium' })
  @IsString()
  @IsOptional()
  diet?: string;

  @ApiPropertyOptional({ example: '15 mins' })
  @IsString()
  @IsOptional()
  duration?: string;
}
