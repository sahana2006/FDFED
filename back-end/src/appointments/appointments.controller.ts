import { BadRequestException, Body, Controller, Delete, Get, Header, Headers, Param, Post, Put, Query, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestContextService } from '../common/request-context.service';
import { PatientsService } from '../patients/patients.service';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointments.dto';

@ApiTags('Appointments')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('appointments')
@UseGuards(RolesGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private getScopedBranchId(): string | undefined {
    return this.requestContextService.getContext()?.branchId;
  }

  private getAppointmentBranchId(appointment: { branchId?: string; doctor?: { branchId?: string } }): string | undefined {
    return appointment.branchId?.trim() || appointment.doctor?.branchId?.trim();
  }

  private isAppointmentInScope(appointment: { branchId?: string; doctor?: { branchId?: string } }): boolean {
    const scopedBranchId = this.getScopedBranchId();
    if (!scopedBranchId) {
      return true;
    }

    return this.getAppointmentBranchId(appointment) === scopedBranchId;
  }

  private async requireAppointmentInScope(appointmentId: string) {
    const allAppointments = await this.appointmentsService.listAppointments();
    const appointment = allAppointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!this.isAppointmentInScope(appointment)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }

    return appointment;
  }

  @Header('Cache-Control', 'no-store')
  @Roles('frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'List appointments' })
  @ApiResponse({ status: 200, description: 'List of appointments' })
  async getAppointments(
    @Query('status') status?: string,
  ) {
    const all = await this.appointmentsService.listAppointments({ status });
    return all.filter((appointment) => this.isAppointmentInScope(appointment));
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Post()
  @ApiOperation({ summary: 'Create an appointment' })
  @ApiBody({ type: CreateAppointmentDto })
  createAppointment(
    @Body() body: CreateAppointmentDto,
    @Headers('role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const scopedBranchId = this.getScopedBranchId();
    const requestedBranchId = body.branchId?.trim() ?? '';
    const branchId = scopedBranchId ?? requestedBranchId;

    if (scopedBranchId && requestedBranchId && requestedBranchId !== scopedBranchId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }

    const normalizedRole = (role || '').trim().toLowerCase();
    const isFrontdesk = normalizedRole === 'frontdesk' || body.source === 'frontdesk' || body.bookedBy === 'frontdesk';
    const staffId = userId?.trim() || body.frontdeskId?.trim();

    return this.appointmentsService.createAppointment({
      userId: body.userId.trim(),
      doctorId: body.doctorId.trim(),
      branchId,
      date: body.date.trim(),
      slot: body.slot.trim(),
      bookedBy: isFrontdesk ? (staffId || body.bookedBy?.trim() || 'frontdesk') : (body.bookedBy || (normalizedRole === 'patient' ? 'patient' : undefined)),
      bookedByRole: normalizedRole || (isFrontdesk ? 'frontdesk' : 'patient'),
      source: isFrontdesk ? 'frontdesk' : (body.source || (normalizedRole === 'patient' ? 'patient' : 'frontdesk')),
      frontdeskId: isFrontdesk ? (staffId || body.bookedBy?.trim() || undefined) : undefined,
    });
  }

  @Header('Cache-Control', 'no-store')
  @Roles('patient', 'admin', 'frontdesk')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get appointments for a user' })
  @ApiResponse({ status: 200, description: 'List of user appointments' })
  async getAppointmentsByUserId(
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ) {
    this.patientsService.getPatientByUserId(userId);
    const all = await this.appointmentsService.getAppointmentsByUserId(userId, status);
    return all.filter((appointment) => this.isAppointmentInScope(appointment));
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('completed/:userId')
  @ApiOperation({ summary: 'Get completed appointments for a user' })
  @ApiResponse({ status: 200, description: 'List of completed user appointments' })
  async getCompletedAppointmentsByUserId(@Param('userId') userId: string) {
    this.patientsService.getPatientByUserId(userId);
    const all = await this.appointmentsService.getCompletedAppointmentsByUserId(userId);
    return all.filter((appointment) => this.isAppointmentInScope(appointment));
  }

  @Roles('doctor', 'frontdesk', 'admin')
  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get appointments for a doctor' })
  @ApiResponse({ status: 200, description: 'List of doctor appointments' })
  getAppointmentsByDoctorId(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.getAppointmentsByDoctorId(doctorId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({ status: 200, description: 'Appointment updated successfully' })
  updateAppointment(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentDto,
  ) {
    this.requireAppointmentInScope(id);
    return this.appointmentsService.updateAppointment(id, {
      date: body.date?.trim(),
      slot: body.slot?.trim(),
    });
  }

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiResponse({ status: 200, description: 'Appointment canceled successfully' })
  cancelAppointment(@Param('id') id: string) {
    this.requireAppointmentInScope(id);
    return this.appointmentsService.cancelAppointment(id);
  }
}
