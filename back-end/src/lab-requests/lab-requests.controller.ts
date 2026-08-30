import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SaveLabReportDraftDto, SubmitLabReportDto } from './dto/lab-requests.dto';
import { LabRequestsService } from './lab-requests.service';

@ApiTags('Lab Requests')
@ApiHeader({ name: 'role', required: true, description: 'User role for RBAC (labtech)' })
@ApiHeader({ name: 'x-user-id', required: true, description: 'Logged-in lab technician ID' })
@Controller('lab-requests')
@UseGuards(RolesGuard)
export class LabRequestsController {
  constructor(private readonly labRequestsService: LabRequestsService) {}

  @Roles('labtech', 'admin')
  @Get()
  @ApiOperation({ summary: 'List lab requests for the logged-in technician branch or admin' })
  @ApiResponse({ status: 200, description: 'Branch-scoped lab requests' })
  findForTechnician(
    @Headers('role') role?: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    const normalizedRole = (role || '').trim().toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'branch_admin') {
      return this.labRequestsService.findAll();
    }
    return this.labRequestsService.findForTechnician(this.requireTechnicianId(technicianId));
  }

  @Roles('patient')
  @Get('patient')
  @ApiOperation({ summary: 'List lab requests for the authenticated patient' })
  @ApiResponse({ status: 200, description: 'Patient lab requests' })
  findForPatient(@Headers('x-user-id') patientId?: string) {
    if (!patientId?.trim()) {
      throw new UnauthorizedException('x-user-id header is missing');
    }
    return this.labRequestsService.findForPatient(patientId.trim());
  }

  @Roles('labtech')
  @Get(':id')
  @ApiOperation({ summary: 'Get a branch-scoped lab request by ID' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab request details' })
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.findByIdForTechnician(
      id,
      this.requireTechnicianId(technicianId),
    );
  }

  @Roles('labtech')
  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a lab request' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab request accepted' })
  accept(
    @Param('id') id: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.acceptRequest(
      id,
      this.requireTechnicianId(technicianId),
    );
  }

  @Roles('labtech')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a lab request' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab request rejected' })
  reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.rejectRequest(
      id,
      this.requireTechnicianId(technicianId),
      body?.reason,
    );
  }

  @Roles('labtech')
  @Patch(':id/start')
  @ApiOperation({ summary: 'Start processing a lab request' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab request marked in progress' })
  start(
    @Param('id') id: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.startRequest(
      id,
      this.requireTechnicianId(technicianId),
    );
  }

  @Roles('labtech')
  @Get(':id/report')
  @ApiOperation({ summary: 'Get lab report for a lab request' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiResponse({ status: 200, description: 'Lab report details' })
  getReport(
    @Param('id') id: string,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.getReportByRequestId(
      id,
      this.requireTechnicianId(technicianId),
    );
  }

  @Roles('labtech')
  @Patch(':id/report/draft')
  @ApiOperation({ summary: 'Save draft lab report' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiBody({ type: SaveLabReportDraftDto })
  @ApiResponse({ status: 200, description: 'Draft lab report saved' })
  saveDraft(
    @Param('id') id: string,
    @Body() body: SaveLabReportDraftDto,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.saveDraftReport(
      id,
      body,
      this.requireTechnicianId(technicianId),
    );
  }

  @Roles('labtech')
  @Post(':id/report/upload')
  @ApiOperation({ summary: 'Upload a lab report file' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        report: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['report'],
    },
  })
  @ApiResponse({ status: 201, description: 'Lab report file uploaded' })
  uploadReport(
    @Param('id') id: string,
    @Req() req: { file?: { filename: string; originalname: string; mimetype: string; size: number; path?: string } },
    @Headers('x-user-id') technicianId?: string,
  ) {
    if (!req.file) {
      throw new BadRequestException('Report file is required');
    }

    return this.labRequestsService.uploadReportFile(
      id,
      this.requireTechnicianId(technicianId),
      req.file,
    );
  }

  @Roles('labtech')
  @Patch(':id/report/submit')
  @ApiOperation({ summary: 'Submit final lab report' })
  @ApiParam({ name: 'id', description: 'Lab request ID' })
  @ApiBody({ type: SubmitLabReportDto })
  @ApiResponse({ status: 200, description: 'Lab report submitted and request completed' })
  submit(
    @Param('id') id: string,
    @Body() body: SubmitLabReportDto,
    @Headers('x-user-id') technicianId?: string,
  ) {
    return this.labRequestsService.submitReport(
      id,
      body,
      this.requireTechnicianId(technicianId),
    );
  }

  private requireTechnicianId(technicianId?: string) {
    if (!technicianId?.trim()) {
      throw new UnauthorizedException('x-user-id header is missing');
    }
    return technicianId.trim();
  }
}
