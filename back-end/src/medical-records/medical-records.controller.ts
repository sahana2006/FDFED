import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/medical-records.dto';

@ApiTags('Medical Records')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('medical-records')
@UseGuards(RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Roles('doctor', 'admin')
  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get medical records by doctor ID' })
  @ApiResponse({ status: 200, description: 'List of doctor medical records' })
  getRecordsByDoctorId(@Param('doctorId') doctorId: string) {
    return this.medicalRecordsService.getRecordsByDoctorId(doctorId);
  }

  @Roles('patient', 'doctor', 'admin')
  @Get(':patientId')
  @ApiOperation({ summary: 'Get medical records by patient ID' })
  @ApiResponse({ status: 200, description: 'List of patient medical records' })
  getRecordsByPatientId(@Param('patientId') patientId: string) {
    return this.medicalRecordsService.getRecordsByPatientId(patientId);
  }

  @Roles('doctor')
  @Post()
  @ApiOperation({ summary: 'Create a new medical record' })
  @ApiBody({ type: CreateMedicalRecordDto })
  @ApiResponse({ status: 201, description: 'Medical record created successfully' })
  createRecord(@Body() body: CreateMedicalRecordDto) {
    return this.medicalRecordsService.createRecord({
      doctorId: body.doctorId.trim(),
      patientId: body.patientId.trim(),
      type: body.type ?? 'consultation',
      doctorName: body.doctorName.trim(),
      specialization: body.specialization.trim(),
      date: body.date?.trim(),
      consultationNote: body.consultationNote?.trim(),
      medicines: body.medicines?.trim(),
      followUp: body.followUp?.trim(),
      followUpDate: body.followUpDate?.trim(),
      appointmentId: body.appointmentId?.trim(),
      tests: body.tests?.trim(),
      lifestyle: body.lifestyle?.trim(),
      diet: body.diet?.trim(),
      duration: body.duration?.trim(),
    });
  }
}
