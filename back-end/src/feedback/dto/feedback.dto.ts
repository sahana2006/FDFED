import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'DOC001' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ example: '5' })
  @IsString()
  @IsNotEmpty()
  rating!: string;

  @ApiPropertyOptional({ example: 'Great doctor!' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ example: '00000000-0000-4000-8000-000000000001', description: "Hospital branch UUID. Defaults to the doctor's branch." })
  @IsUUID()
  @IsOptional()
  branchId?: string;
}
