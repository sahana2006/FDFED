import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateBranchAdminDto {
  @ApiProperty({ example: 'Banjara Hills Administrator' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'branch.admin@medbits.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'SecurePassword@123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001', description: 'Hospital branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;
}
