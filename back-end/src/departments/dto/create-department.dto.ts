import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Heart and cardiovascular care' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;
}
