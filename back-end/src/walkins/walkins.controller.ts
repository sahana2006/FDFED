import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalkInsService } from './walkins.service';
import { CreateWalkInDto } from './dto/walkins.dto';

@ApiTags('Walkins')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('walkins')
@UseGuards(RolesGuard)
export class WalkInsController {
  constructor(private readonly walkinsService: WalkInsService) {}

  @Roles('frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'Get all walk-in registrations' })
  @ApiResponse({ status: 200, description: 'List of all walk-ins' })
  getAllWalkIns() {
    return this.walkinsService.getAllWalkIns();
  }

  @Roles('frontdesk', 'admin')
  @Post()
  @ApiOperation({ summary: 'Register a new walk-in patient' })
  @ApiBody({ type: CreateWalkInDto })
  @ApiResponse({ status: 201, description: 'Walk-in patient registered successfully' })
  createWalkIn(@Body() body: CreateWalkInDto) {
    return this.walkinsService.createWalkIn({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      dob: body.dob.trim(),
      gender: body.gender.trim(),
      bloodGroup: body.bloodGroup.trim(),
      guardianName: body.guardianName?.trim() ?? '',
    });
  }
}
