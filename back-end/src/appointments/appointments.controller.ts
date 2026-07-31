import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointments.dto';

@ApiTags('Appointments')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('appointments')
@UseGuards(RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Header('Cache-Control', 'no-store')
  @Roles('frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'List appointments' })
  @ApiResponse({ status: 200, description: 'List of appointments' })
  getAppointments(
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.listAppointments({
      status,
    });
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Post()
  @ApiOperation({ summary: 'Create an appointment' })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({ status: 201, description: 'Appointment created successfully' })
  createAppointment(@Body() body: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment({
      userId: body.userId.trim(),
      doctorId: body.doctorId.trim(),
      date: body.date.trim(),
      slot: body.slot.trim(),
    });
  }

  @Header('Cache-Control', 'no-store')
  @Roles('patient', 'admin', 'frontdesk')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get appointments for a user' })
  @ApiResponse({ status: 200, description: 'List of user appointments' })
  getAppointmentsByUserId(
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ) {
    console.log('Appointments API hit', userId);
    return this.appointmentsService.getAppointmentsByUserId(userId, status);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('completed/:userId')
  @ApiOperation({ summary: 'Get completed appointments for a user' })
  @ApiResponse({ status: 200, description: 'List of completed user appointments' })
  getCompletedAppointmentsByUserId(@Param('userId') userId: string) {
    return this.appointmentsService.getCompletedAppointmentsByUserId(userId);
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
    return this.appointmentsService.cancelAppointment(id);
  }
}

