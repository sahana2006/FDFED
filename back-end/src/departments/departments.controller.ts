import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (admin)' })
@Controller('departments')
@Roles('admin')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a department within a hospital branch' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, description: 'Department created' })
  create(@Body() input: CreateDepartmentDto) { return this.departmentsService.create(input); }

  @Get()
  @ApiOperation({ summary: 'List departments' })
  findAll() { return this.departmentsService.findAll(); }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Department UUID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.departmentsService.findOne(id); }

  @Patch(':id')
  @ApiBody({ type: UpdateDepartmentDto })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateDepartmentDto) { return this.departmentsService.update(id, input); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.departmentsService.remove(id); }
}
