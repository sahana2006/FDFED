import { Controller, Get, Headers, Param, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LabRequestsService } from './lab-requests.service';

@ApiTags('Lab Reports')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (labtech, doctor, patient)' })
@ApiHeader({ name: 'x-user-id', required: true, description: 'Logged-in user ID' })
@Controller('lab-reports')
@UseGuards(RolesGuard)
export class LabReportsController {
  constructor(private readonly labRequestsService: LabRequestsService) {}

  @Roles('labtech', 'admin')
  @Get()
  @ApiOperation({ summary: 'List all lab reports for the logged-in technician branch or admin' })
  @ApiResponse({ status: 200, description: 'Branch-scoped lab reports' })
  findAll(
    @Headers('role') role?: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    const normalizedRole = (role || '').trim().toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'branch_admin') {
      return this.labRequestsService.findAllReports();
    }
    return this.labRequestsService.findAllReportsForTechnician(
      this.requireUserId(technicianId),
    );
  }

  @Roles('doctor')
  @Get('doctor')
  @ApiOperation({ summary: 'List all submitted lab reports requested by the logged-in doctor' })
  @ApiResponse({ status: 200, description: 'Doctor requested submitted lab reports' })
  findForDoctor(@Headers('x-user-id') doctorId?: string) {
    return this.labRequestsService.findReportsForDoctor(
      this.requireUserId(doctorId),
    );
  }

  @Roles('patient')
  @Get('patient')
  @ApiOperation({ summary: 'List all submitted lab reports for the logged-in patient' })
  @ApiResponse({ status: 200, description: 'Patient submitted lab reports' })
  findForPatient(@Headers('x-user-id') patientId?: string) {
    return this.labRequestsService.findReportsForPatient(
      this.requireUserId(patientId),
    );
  }

  @Roles('labtech', 'doctor', 'patient')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific lab report by ID with role-based authorization' })
  @ApiParam({ name: 'id', description: 'Lab report ID or lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab report details' })
  findOne(
    @Param('id') id: string,
    @Headers('role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const normalizedRole = (role || '').trim().toLowerCase();
    const normalizedUserId = this.requireUserId(userId);
    return this.labRequestsService.findReportForUser(
      id,
      normalizedRole,
      normalizedUserId,
    );
  }

  private requireUserId(userId?: string) {
    if (!userId?.trim()) {
      throw new UnauthorizedException('x-user-id header is missing');
    }
    return userId.trim();
  }
}
