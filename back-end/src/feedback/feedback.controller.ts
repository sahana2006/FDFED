import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/feedback.dto';

@ApiTags('Feedback')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('feedback')
@UseGuards(RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Roles('patient')
  @Post()
  @ApiOperation({ summary: 'Submit feedback for a doctor' })
  @ApiBody({ type: CreateFeedbackDto })
  @ApiResponse({ status: 201, description: 'Feedback created successfully' })
  createFeedback(@Body() body: CreateFeedbackDto) {
    return this.feedbackService.createFeedback({
      userId: body.userId.trim(),
      doctorId: body.doctorId.trim(),
      rating: body.rating.trim(),
      comment: body.comment?.trim() ?? '',
    });
  }

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all feedback given by a user' })
  @ApiResponse({ status: 200, description: 'List of user feedback' })
  getFeedbackByUserId(@Param('userId') userId: string) {
    return this.feedbackService.getFeedbackByUserId(userId);
  }

  @Roles('doctor', 'patient', 'frontdesk', 'admin')
  @Get(':doctorId')
  @ApiOperation({ summary: 'Get all feedback for a specific doctor' })
  @ApiResponse({ status: 200, description: 'List of doctor feedback' })
  getFeedbackByDoctorId(@Param('doctorId') doctorId: string) {
    return this.feedbackService.getFeedbackByDoctorId(doctorId);
  }
}
