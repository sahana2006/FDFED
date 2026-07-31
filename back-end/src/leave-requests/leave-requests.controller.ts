import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto, UpdateLeaveRequestStatusDto } from './dto/leave-requests.dto';

@ApiTags('Leave Requests')
@ApiHeader({
  name: 'role',
  description: 'User role for RBAC',
  required: true,
})
@Controller('leave-requests')
@UseGuards(RolesGuard)
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @ApiOperation({ summary: 'Create a new leave request (Doctor)' })
  @ApiBody({ type: CreateLeaveRequestDto })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  @Roles('doctor')
  @Post()
  createLeaveRequest(@Body() body: CreateLeaveRequestDto) {
    return this.leaveRequestsService.createLeaveRequest(
      body.doctorId,
      body.date,
      body.type,
      body.reason,
    );
  }

  @ApiOperation({ summary: 'Get all leave requests' })
  @ApiResponse({ status: 200, description: 'List of all leave requests' })
  @Roles('admin', 'doctor', 'frontdesk')
  @Get()
  getLeaveRequests() {
    return this.leaveRequestsService.getAllRequests();
  }

  @ApiOperation({ summary: 'Update leave request status (Admin)' })
  @ApiParam({ name: 'id', description: 'Leave Request ID' })
  @ApiBody({ type: UpdateLeaveRequestStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @Roles('admin')
  @Put(':id')
  updateRequestStatus(
    @Param('id') id: string,
    @Body() body: UpdateLeaveRequestStatusDto,
  ) {
    return this.leaveRequestsService.updateRequestStatus(id, body.status);
  }
}
