import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody, ApiParam } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  PatientsService,
} from './patients.service';
import { CreatePatientDto, UpdatePatientProfileDto } from './dto/patients.dto';

@ApiTags('Patients')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('patients')
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles('frontdesk', 'admin')
  @Post()
  @ApiOperation({ summary: 'Create a patient profile' })
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({ status: 201, description: 'Patient profile created successfully' })
  createPatient(@Body() body: CreatePatientDto) {
    const patient = this.patientsService.createPatient({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      dob: body.dob.trim(),
      gender: body.gender.trim(),
      bloodGroup: body.bloodGroup.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      guardianName: body.guardianName?.trim() ?? '',
    });

    return {
      ...patient,
      id: patient.userId,
      name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
  }

  @Roles('doctor', 'frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  @ApiResponse({ status: 200, description: 'List of all patients' })
  getAllPatients() {
    const patients = this.patientsService.getAllPatients();
    return patients || [];
  }

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get(':userId')
  @ApiOperation({ summary: 'Get patient profile by user ID' })
  @ApiParam({ name: 'userId', description: 'Patient user ID' })
  @ApiResponse({ status: 200, description: 'Patient profile object' })
  getPatientProfile(@Param('userId') userId: string) {
    return this.patientsService.getPatientByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Put(':userId')
  @ApiOperation({ summary: 'Update patient profile' })
  @ApiParam({ name: 'userId', description: 'Patient user ID' })
  @ApiBody({ type: UpdatePatientProfileDto })
  @ApiResponse({ status: 200, description: 'Patient profile updated successfully' })
  updatePatientProfile(
    @Param('userId') userId: string,
    @Body() body: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updatePatientByUserId(userId, {
      firstName: body.firstName?.trim() ?? '',
      lastName: body.lastName?.trim() ?? '',
      dob: body.dob?.trim() ?? '',
      gender: body.gender?.trim() ?? '',
      bloodGroup: body.bloodGroup?.trim() ?? '',
      phone: body.phone?.trim() ?? '',
      email: body.email?.trim() ?? '',
      guardianName: body.guardianName?.trim() ?? '',
    });
  }
}
