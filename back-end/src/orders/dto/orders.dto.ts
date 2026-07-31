import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'PAT001' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'MED001' })
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class UpdateCartOrderDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}
