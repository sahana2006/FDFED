import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestBookingDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'TEST001' })
  @IsString()
  @IsNotEmpty()
  labTestId!: string;
}

