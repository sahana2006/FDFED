import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { LabRequestStatus } from '../lab-requests.service';

export class CreateLabRequestDto {
  @ApiProperty({ example: 'MR001' })
  @IsString()
  @IsNotEmpty()
  medicalRecordId!: string;

  @ApiProperty({ example: 'APT001' })
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ example: 'Ria Sharma' })
  @IsString()
  @IsNotEmpty()
  patientName!: string;

  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: 'Dr. S Madhuri' })
  @IsString()
  @IsNotEmpty()
  doctorName!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({ example: 'CBC Test' })
  @IsString()
  @IsNotEmpty()
  testName!: string;

  @ApiProperty({ example: '2026-08-22' })
  @IsString()
  @IsNotEmpty()
  requestDate!: string;

  @ApiPropertyOptional({ example: 'Patient complains of fatigue.' })
  @IsString()
  @IsOptional()
  consultationNote?: string;

  @ApiPropertyOptional({ example: 'Iron supplement' })
  @IsString()
  @IsOptional()
  prescriptionMedicines?: string;
}

export class UpdateLabRequestStatusDto {
  @ApiProperty({ enum: ['pending', 'accepted', 'in_progress', 'draft_report', 'completed', 'rejected'] })
  @IsString()
  @IsIn(['pending', 'accepted', 'in_progress', 'draft_report', 'completed', 'rejected'])
  status!: LabRequestStatus;
}

export class RejectLabRequestDto {
  @ApiPropertyOptional({ example: 'Sample hemolyzed / insufficient specimen' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class FileAttachmentDto {
  @ApiPropertyOptional({ example: 'detailed_blood_report.pdf' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiPropertyOptional({ example: 10240 })
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'data:application/pdf;base64,...' })
  @IsString()
  @IsOptional()
  fileData?: string;
}

export class SaveLabReportDraftDto {
  @ApiPropertyOptional({ example: 'Hemoglobin: 13.5 g/dL, Platelets: 250,000 /mcL' })
  @IsString()
  @IsOptional()
  result?: string;

  @ApiPropertyOptional({ example: 'All cell lines within normal limits.' })
  @IsString()
  @IsOptional()
  findings?: string;

  @ApiPropertyOptional({ example: 'Routine sample, no hemolysis.' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ type: FileAttachmentDto })
  @IsOptional()
  fileAttachment?: FileAttachmentDto;
}

export class SubmitLabReportDto {
  @ApiProperty({ example: 'Hemoglobin: 13.5 g/dL, Platelets: 250,000 /mcL' })
  @IsString()
  @IsNotEmpty()
  result!: string;

  @ApiPropertyOptional({ example: 'All cell lines within normal limits.' })
  @IsString()
  @IsOptional()
  findings?: string;

  @ApiPropertyOptional({ example: 'Routine sample, no hemolysis.' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ type: FileAttachmentDto })
  @IsOptional()
  fileAttachment?: FileAttachmentDto;
}
