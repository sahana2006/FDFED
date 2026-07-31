import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MedicinesService } from './medicines.service';

@ApiTags('Medicines')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('medicines')
@UseGuards(RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'List all medicines' })
  @ApiResponse({ status: 200, description: 'List of medicines' })
  listMedicines() {
    return this.medicinesService.findAll();
  }
}

