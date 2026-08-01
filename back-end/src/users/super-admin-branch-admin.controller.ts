import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SuperAdminOnly } from '../common/decorators/roles.decorator';
import { CreateBranchAdminDto } from './dto/create-branch-admin.dto';
import { UsersService } from './users.service';

@ApiTags('Super Admin - Branch Admins')
@ApiHeader({ name: 'role', required: true, description: 'Must be super_admin' })
@Controller('super-admin/branch-admins')
@SuperAdminOnly()
export class SuperAdminBranchAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Branch Admin account' })
  @ApiBody({ type: CreateBranchAdminDto })
  @ApiResponse({ status: 201, description: 'Branch Admin account created' })
  @ApiResponse({ status: 400, description: 'Invalid branch or account details' })
  @ApiResponse({ status: 409, description: 'Email is already registered' })
  create(@Body() input: CreateBranchAdminDto) {
    return this.usersService.createBranchAdminUser({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      branchId: input.branchId.trim(),
    });
  }
}
