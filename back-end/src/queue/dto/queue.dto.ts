import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQueueDto {
  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID. Defaults to the selected doctor\'s branch.' })
  @IsUUID()
  @IsOptional()
  branchId?: string;
}

export class UpdateQueueDto {
  @ApiProperty({ example: 'waiting', enum: ['waiting', 'in-consultation', 'done'] })
  @IsNotEmpty()
  @IsIn(['waiting', 'in-consultation', 'done'])
  @IsString()
  status!: 'waiting' | 'in-consultation' | 'done';
}
