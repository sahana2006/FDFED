import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({ example: '2023-12-01' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ example: '10:00 AM' })
  @IsString()
  @IsNotEmpty()
  slot!: string;

  @ApiPropertyOptional({ example: 'frontdesk' })
  @IsString()
  @IsOptional()
  bookedBy?: string;

  @ApiPropertyOptional({ example: 'frontdesk' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'FD001' })
  @IsString()
  @IsOptional()
  frontdeskId?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: '2023-12-02' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '11:00 AM' })
  @IsString()
  @IsOptional()
  slot?: string;
}
