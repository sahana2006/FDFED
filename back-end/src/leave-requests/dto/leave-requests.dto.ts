import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: '2026-05-10', description: 'ISO date' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiPropertyOptional({ example: 'Casual', description: 'Type of leave' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'Personal', description: 'Optional reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateLeaveRequestStatusDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsString()
  @IsIn(['approved', 'rejected'])
  @IsNotEmpty()
  status!: 'approved' | 'rejected';
}
