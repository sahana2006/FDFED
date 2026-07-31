import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLabTechnicianDto } from './dto/create-lab-technician.dto';
import { LabTechniciansService } from './lab-technicians.service';

@ApiTags('Lab Technicians')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (admin)' })
@Controller('lab-technicians')
@UseGuards(RolesGuard)
export class LabTechniciansController {
  constructor(private readonly labTechniciansService: LabTechniciansService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a branch-scoped lab technician account' })
  @ApiBody({ type: CreateLabTechnicianDto })
  @ApiResponse({ status: 201, description: 'Lab technician created' })
  create(@Body() body: CreateLabTechnicianDto) {
    return this.labTechniciansService.create(body);
  }
}
