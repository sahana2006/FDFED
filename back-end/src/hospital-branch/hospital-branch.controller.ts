import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateHospitalBranchDto } from './dto/create-hospital-branch.dto';
import { UpdateHospitalBranchDto } from './dto/update-hospital-branch.dto';
import { HospitalBranchService } from './hospital-branch.service';

@ApiTags('Hospital Branches')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (admin)' })
@Controller('hospital-branches')
export class HospitalBranchController {
  constructor(private readonly hospitalBranchService: HospitalBranchService) {}

  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create a hospital branch' })
  @ApiBody({ type: CreateHospitalBranchDto })
  @ApiResponse({ status: 201, description: 'Hospital branch created' })
  @ApiResponse({ status: 409, description: 'Branch email already exists' })
  create(@Body() createHospitalBranchDto: CreateHospitalBranchDto) {
    return this.hospitalBranchService.create(createHospitalBranchDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all hospital branches' })
  @ApiResponse({ status: 200, description: 'Hospital branch list' })
  findAll() {
    return this.hospitalBranchService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hospital branch by ID' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiResponse({ status: 200, description: 'Hospital branch found' })
  @ApiResponse({ status: 404, description: 'Hospital branch not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiBody({ type: UpdateHospitalBranchDto })
  @ApiResponse({ status: 200, description: 'Hospital branch updated' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateHospitalBranchDto: UpdateHospitalBranchDto,
  ) {
    return this.hospitalBranchService.update(id, updateHospitalBranchDto);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a hospital branch' })
  @ApiParam({ name: 'id', description: 'Hospital branch UUID' })
  @ApiResponse({ status: 204, description: 'Hospital branch deleted' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitalBranchService.remove(id);
  }

}
