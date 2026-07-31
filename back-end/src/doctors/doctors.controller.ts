import {
  BadRequestException,
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
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AppointmentsService } from '../appointments/appointments.service';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, UpdateDoctorDto, CreateSlotBlockDto, MarkUnavailableDateDto } from './dto/doctors.dto';

@ApiTags('Doctors')
@ApiHeader({
  name: 'role',
  description: 'User role for RBAC (patient | doctor | frontdesk)',
  required: true,
})
@Controller('doctors')
@UseGuards(RolesGuard)
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // ─── Doctor Listing & Profile ────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all doctors, optionally filtered by specialization' })
  @ApiQuery({ name: 'specialization', required: false, description: 'Filter by specialization (e.g. Cardiologist)' })
  @ApiResponse({ status: 200, description: 'Array of doctor profiles' })
  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Header('Cache-Control', 'no-store')
  @Get()
  listDoctors(@Query('specialization') specialization?: string) {
    return this.doctorsService.findAll(specialization);
  }

  @ApiOperation({ summary: 'Add a doctor and create matching doctor login user' })
  @ApiResponse({ status: 201, description: 'Doctor profile created' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate email' })
  @Roles('admin')
  @Post()
  @ApiBody({ type: CreateDoctorDto })
  addDoctor(@Body() body: CreateDoctorDto) {
    return this.doctorsService.createDoctor({
      name: body.name?.trim() ?? '',
      email: body.email?.trim() ?? '',
      password: body.password ?? '',
      specialization: body.specialization?.trim() ?? '',
      slots: body.slots ?? [],
      department: body.department?.trim(),
      qualification: body.qualification?.trim(),
      experience: body.experience,
      age: body.age,
      gender: body.gender?.trim(),
      phone: body.phone?.trim(),
      licenseNo: body.licenseNo?.trim(),
      bio: body.bio?.trim(),
    });
  }

  @ApiOperation({ summary: 'Edit a doctor profile by userId' })
  @ApiParam({ name: 'userId', description: 'Doctor user ID (e.g. DOC001)' })
  @ApiResponse({ status: 200, description: 'Doctor profile updated' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @Roles('admin')
  @Put(':userId')
  @ApiBody({ type: UpdateDoctorDto })
  updateDoctor(@Param('userId') userId: string, @Body() body: UpdateDoctorDto) {
    return this.doctorsService.updateDoctor(userId, {
      name: body.name?.trim(),
      email: body.email?.trim(),
      specialization: body.specialization?.trim(),
      slots: body.slots,
      department: body.department?.trim(),
      qualification: body.qualification?.trim(),
      experience: body.experience,
      age: body.age,
      gender: body.gender?.trim(),
      phone: body.phone?.trim(),
      licenseNo: body.licenseNo?.trim(),
      bio: body.bio?.trim(),
    });
  }

  @ApiOperation({ summary: 'Get a single doctor profile by ID' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID (e.g. DOC001)' })
  @ApiResponse({ status: 200, description: 'Doctor profile object' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get(':doctorId')
  getDoctorProfile(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getDoctorById(doctorId);
  }

  @ApiOperation({ summary: 'Get available booking slots for a doctor on a given date' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date YYYY-MM-DD. Without date returns all doctor slots.' })
  @ApiResponse({ status: 200, description: 'Array of available slot time strings' })
  @Roles('patient', 'doctor', 'frontdesk')
  @Get(':doctorId/slots')
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date?: string,
  ) {
    const doctor = this.doctorsService.getDoctorById(doctorId);
    if (!date?.trim()) {
      return doctor.slots;
    }

    return this.appointmentsService.getAvailableSlots(doctorId, date.trim());
  }

  @ApiOperation({ summary: 'Get all appointments for a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'completed'] })
  @ApiResponse({ status: 200, description: 'Array of appointment objects' })
  @Roles('doctor', 'frontdesk')
  @Get(':doctorId/appointments')
  getAppointmentsByDoctorId(
    @Param('doctorId') doctorId: string,
    @Query('status') status?: string,
  ) {
    this.doctorsService.getDoctorById(doctorId);
    const appointments = this.appointmentsService.getAppointmentsByDoctorId(doctorId);
    if (status === 'upcoming' || status === 'completed') {
      return appointments.filter((a) => a.status === status);
    }
    return appointments;
  }

  // ─── Slot Blocks ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all blocked time slots for a doctor (optionally filter by date)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by ISO date YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Array of SlotBlock records' })
  @Roles('doctor', 'frontdesk')
  @Get(':doctorId/slot-blocks')
  getSlotBlocks(
    @Param('doctorId') doctorId: string,
    @Query('date') date?: string,
  ) {
    return this.doctorsService.getSlotBlocks(doctorId, date?.trim());
  }

  @ApiOperation({ summary: 'Block a specific time slot on a date for a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiBody({ type: CreateSlotBlockDto })
  @ApiResponse({ status: 201, description: 'SlotBlock record created' })
  @ApiResponse({ status: 400, description: 'Slot already blocked / invalid slot / date fully unavailable' })
  @Roles('doctor')
  @Post(':doctorId/slot-blocks')
  blockSlot(
    @Param('doctorId') doctorId: string,
    @Body() body: CreateSlotBlockDto,
  ) {
    const date = body.date?.trim() ?? '';
    const slot = body.slot?.trim() ?? '';

    // Prevent blocking a slot that already has a booked appointment
    if (date && slot) {
      const existingAppointments = this.appointmentsService.getAppointmentsByDoctorId(doctorId);
      const hasBooking = existingAppointments.some(
        (a) => a.date === date && a.slot === slot && a.status === 'upcoming',
      );
      if (hasBooking) {
        throw new BadRequestException(
          `Cannot block slot "${slot}" on ${date} — a patient has already booked this slot. Cancel the appointment first.`,
        );
      }
    }

    return this.doctorsService.blockSlot(doctorId, { date, slot, reason: body.reason });
  }

  @ApiOperation({ summary: 'Unblock (remove) a previously blocked time slot' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiParam({ name: 'blockId', description: 'SlotBlock ID (returned when block was created)' })
  @ApiResponse({ status: 200, description: 'Removed SlotBlock record' })
  @ApiResponse({ status: 404, description: 'Block record not found' })
  @Roles('doctor')
  @Delete(':doctorId/slot-blocks/:blockId')
  unblockSlot(
    @Param('doctorId') doctorId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.doctorsService.unblockSlot(doctorId, blockId);
  }

  // ─── Unavailable Dates ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all fully-unavailable dates for a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiResponse({ status: 200, description: 'Array of UnavailableDate records' })
  @Roles('doctor', 'frontdesk', 'patient')
  @Get(':doctorId/unavailable-dates')
  getUnavailableDates(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getUnavailableDates(doctorId);
  }

  @ApiOperation({ summary: 'Mark an entire date as unavailable for a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiBody({ type: MarkUnavailableDateDto })
  @ApiResponse({ status: 201, description: 'UnavailableDate record created' })
  @ApiResponse({ status: 400, description: 'Date already marked unavailable' })
  @Roles('doctor')
  @Post(':doctorId/unavailable-dates')
  markDateUnavailable(
    @Param('doctorId') doctorId: string,
    @Body() body: MarkUnavailableDateDto,
  ) {
    const date = body.date?.trim() ?? '';

    // Prevent marking a date unavailable if any upcoming appointments exist on that date
    if (date) {
      const existingAppointments = this.appointmentsService.getAppointmentsByDoctorId(doctorId);
      const bookedSlots = existingAppointments
        .filter((a) => a.date === date && a.status === 'upcoming')
        .map((a) => a.slot);

      if (bookedSlots.length > 0) {
        throw new BadRequestException(
          `Cannot mark ${date} as unavailable — ${bookedSlots.length} appointment(s) are already booked on this date (slots: ${bookedSlots.join(', ')}). Cancel them first.`,
        );
      }
    }

    return this.doctorsService.markDateUnavailable(doctorId, date);
  }

  @ApiOperation({ summary: 'Remove an unavailable date entry (make date available again)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiParam({ name: 'unavailId', description: 'UnavailableDate record ID' })
  @ApiResponse({ status: 200, description: 'Removed UnavailableDate record' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @Roles('doctor')
  @Delete(':doctorId/unavailable-dates/:unavailId')
  removeUnavailableDate(
    @Param('doctorId') doctorId: string,
    @Param('unavailId') unavailId: string,
  ) {
    return this.doctorsService.removeUnavailableDate(doctorId, unavailId);
  }

  // ─── Weekly Availability Overview ────────────────────────────────────────────

  @ApiOperation({ summary: 'Get weekly availability overview for a doctor (Mon–Sun)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiQuery({
    name: 'weekStart',
    required: false,
    description: 'ISO date of Monday for the desired week (defaults to current week)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of 7 day objects with slot counts and availability status',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-05-04' },
          dayName: { type: 'string', example: 'Mon' },
          totalSlots: { type: 'number', example: 5 },
          blockedSlots: { type: 'number', example: 2 },
          availableSlots: { type: 'number', example: 3 },
          isUnavailable: { type: 'boolean', example: false },
        },
      },
    },
  })
  @Roles('doctor', 'frontdesk', 'patient')
  @Get(':doctorId/weekly-availability')
  getWeeklyAvailability(
    @Param('doctorId') doctorId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.doctorsService.getWeeklyAvailability(doctorId, weekStart);
  }
}
