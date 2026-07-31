import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFrontdeskDto {
  @ApiProperty({ example: 'Alice Smith' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'alice@medbits.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Female' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'ADM001' })
  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @ApiPropertyOptional({ example: ['English', 'Spanish'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ example: 'Counter 1' })
  @IsString()
  @IsOptional()
  counter?: string;

  @ApiPropertyOptional({ example: '08:00 AM' })
  @IsString()
  @IsOptional()
  shiftStart?: string;

  @ApiPropertyOptional({ example: '04:00 PM' })
  @IsString()
  @IsOptional()
  shiftEnd?: string;
}

export class UpdateFrontdeskDto {
  @ApiPropertyOptional({ example: 'Alice Smith' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'alice@medbits.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Female' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'ADM001' })
  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @ApiPropertyOptional({ example: ['English', 'Spanish'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ example: 'Counter 1' })
  @IsString()
  @IsOptional()
  counter?: string;

  @ApiPropertyOptional({ example: '08:00 AM' })
  @IsString()
  @IsOptional()
  shiftStart?: string;

  @ApiPropertyOptional({ example: '04:00 PM' })
  @IsString()
  @IsOptional()
  shiftEnd?: string;
}
