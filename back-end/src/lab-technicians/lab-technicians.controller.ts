import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { isBranchAdminRole } from '../common/branch-request-context';
import { RequestContextService } from '../common/request-context.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLabTechnicianDto } from './dto/create-lab-technician.dto';
import { LabTechniciansService } from './lab-technicians.service';

@ApiTags('Lab Technicians')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (admin, branch_admin)' })
@ApiHeader({ name: 'x-user-id', required: false, description: 'Required for branch_admin scoping' })
@Controller('lab-technicians')
@UseGuards(RolesGuard)
export class LabTechniciansController {
  constructor(
    private readonly labTechniciansService: LabTechniciansService,
    private readonly requestContextService: RequestContextService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List branch-scoped lab technicians' })
  @ApiResponse({ status: 200, description: 'List of lab technicians' })
  findAll() {
    const context = this.requestContextService.getContext();
    const scopedBranchId = context?.branchId;
    return this.labTechniciansService.findAll(scopedBranchId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a branch-scoped lab technician account' })
  @ApiBody({ type: CreateLabTechnicianDto })
  @ApiResponse({ status: 201, description: 'Lab technician created' })
  create(@Body() body: CreateLabTechnicianDto) {
    const context = this.requestContextService.getContext();
    const scopedBranchId = context?.branchId;
    if (isBranchAdminRole(context?.role)) {
      if (!context?.userId) {
        throw new BadRequestException('x-user-id header is required for branch admin requests');
      }
      if (!scopedBranchId) {
        throw new ForbiddenException('Branch admin is not assigned to a hospital branch');
      }
    }

    return this.labTechniciansService.create({
      name: body.name,
      email: body.email,
      password: body.password,
      branchId: scopedBranchId ?? body.branchId,
    });
  }
}
