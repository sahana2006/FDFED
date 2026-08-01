import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DoctorsService } from '../doctors/doctors.service';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Followups')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('followups')
@UseGuards(RolesGuard)
export class FollowUpsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  @Roles('frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'Get followups list' })
  @ApiResponse({ status: 200, description: 'List of followups' })
  getFollowUps() {
    return this.medicalRecordsService.getFollowUps().filter((record) => {
      try {
        this.doctorsService.getDoctorById(record.doctorId);
        return true;
      } catch {
        return false;
      }
    });
  }
}
