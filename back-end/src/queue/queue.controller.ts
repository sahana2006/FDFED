import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody, ApiParam } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  QueueService,
} from './queue.service';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';

@ApiTags('Queue')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('queue')
@UseGuards(RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Roles('frontdesk', 'doctor', 'admin')
  @Post()
  @ApiOperation({ summary: 'Create a new queue token' })
  @ApiBody({ type: CreateQueueDto })
  @ApiResponse({ status: 201, description: 'Queue token created' })
  createQueueToken(@Body() body: CreateQueueDto) {
    return this.queueService.createQueueToken({
      doctorId: body.doctorId.trim(),
      userId: body.userId.trim(),
    });
  }

  @Roles('frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'Get all queue items' })
  @ApiResponse({ status: 200, description: 'List of all queue items' })
  getAllQueueItems() {
    return this.queueService.getAllQueueItems();
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get queue items for a user' })
  @ApiParam({ name: 'userId', description: 'Patient user ID' })
  getQueueByUserId(@Param('userId') userId: string) {
    return this.queueService.getQueueByUserId(userId);
  }

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get(':doctorId')
  @ApiOperation({ summary: 'Get queue items for a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  getQueueByDoctorId(@Param('doctorId') doctorId: string) {
    return this.queueService.getQueueByDoctorId(doctorId);
  }

  @Roles('doctor', 'frontdesk', 'admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update status of a queue token' })
  @ApiParam({ name: 'id', description: 'Queue ID' })
  @ApiBody({ type: UpdateQueueDto })
  updateQueueStatus(
    @Param('id') id: string,
    @Body() body: UpdateQueueDto,
  ) {
    return this.queueService.updateQueueStatus(id, {
      status: body.status,
    });
  }
}
