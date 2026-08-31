import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  @IsString()
  @IsNotEmpty()
  branchId!: string;
}

export class ConfirmTestBookingsDto {
  @ApiPropertyOptional({ example: 'Ria Sharma' })
  @IsString()
  @IsOptional()
  patientName?: string;
}

