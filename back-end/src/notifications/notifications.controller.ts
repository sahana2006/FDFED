import { Controller, Get, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Notifications')
@ApiHeader({ name: 'role', description: 'User role', required: true })
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Get all notifications for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @Roles('admin', 'doctor', 'frontdesk', 'patient')
  @Get('user/:userId')
  getNotifications(@Param('userId') userId: string) {
    return this.notificationsService.getNotificationsForUser(userId);
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @Roles('admin', 'doctor', 'frontdesk', 'patient')
  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @ApiOperation({ summary: 'Clear all notifications for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Notifications cleared' })
  @Roles('admin', 'doctor', 'frontdesk', 'patient')
  @Delete('user/:userId')
  clearAll(@Param('userId') userId: string) {
    this.notificationsService.clearAllForUser(userId);
    return { success: true };
  }
}
