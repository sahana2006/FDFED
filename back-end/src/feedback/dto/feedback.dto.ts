import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
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
}
