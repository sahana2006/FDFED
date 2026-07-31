import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ example: '2023-12-01' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ example: '10:00 AM' })
  @IsString()
  @IsNotEmpty()
  slot!: string;
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
