import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../users/users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateHospitalBranchDto } from './dto/create-hospital-branch.dto';
import { UpdateHospitalBranchDto } from './dto/update-hospital-branch.dto';
import { HospitalBranchStatus } from './entities/hospital-branch.entity';
import { HospitalBranchService } from './hospital-branch.service';

@ApiTags('Super Admin - Hospital Branches')
@ApiHeader({ name: 'role', required: true, description: 'Must be super_admin' })
@Controller('super-admin/hospital-branches')
@Roles(Role.SUPER_ADMIN)
export class SuperAdminHospitalBranchController {
  constructor(private readonly hospitalBranchService: HospitalBranchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a hospital branch' })
  @ApiBody({ type: CreateHospitalBranchDto })
  @ApiResponse({ status: 201, description: 'Hospital branch created' })
  @ApiResponse({ status: 409, description: 'Branch email already exists' })
  create(@Body() input: CreateHospitalBranchDto) {
    return this.hospitalBranchService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List all hospital branches' })
  @ApiResponse({ status: 200, description: 'Hospital branch list' })
  findAll() {
    return this.hospitalBranchService.findAll();
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get super admin earnings snapshot' })
  getEarnings() {
    return this.hospitalBranchService.getEarnings();
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get statistics for a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch statistics snapshot' })
  getStatistics(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.getBranchStatistics(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hospital branch by ID' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiResponse({ status: 404, description: 'Hospital branch not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiBody({ type: UpdateHospitalBranchDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateHospitalBranchDto,
  ) {
    return this.hospitalBranchService.update(id, input);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  enable(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.update(id, { status: HospitalBranchStatus.ACTIVE });
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  disable(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.update(id, { status: HospitalBranchStatus.INACTIVE });
  }
}
