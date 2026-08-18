import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LabTestsService } from './labtests.service';
import { CreateTestBookingDto } from './dto/labtests.dto';

@ApiTags('Lab Tests')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('labtests')
@UseGuards(RolesGuard)
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  @Roles('patient', 'doctor', 'frontdesk', 'admin')
  @Get()
  @ApiOperation({ summary: 'List all available lab tests' })
  @ApiResponse({ status: 200, description: 'List of lab tests' })
  listLabTests() {
    return this.labTestsService.findAllTests();
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Post('book')
  @ApiOperation({ summary: 'Add a lab test to cart/booking' })
  @ApiBody({ type: CreateTestBookingDto })
  @ApiResponse({ status: 201, description: 'Lab test booked successfully' })
  createBooking(@Body() body: CreateTestBookingDto) {
    return this.labTestsService.createBooking({
      userId: body.userId.trim(),
      labTestId: body.labTestId.trim(),
    });
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('cart/:userId')
  @ApiOperation({ summary: 'Get current lab test cart for a user' })
  getCartBookings(@Param('userId') userId: string) {
    return this.labTestsService.getCartBookingsByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Post('confirm/:userId')
  @ApiOperation({ summary: 'Confirm cart bookings for a user' })
  confirmBookings(@Param('userId') userId: string) {
    return this.labTestsService.confirmBookingsByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('history/:userId')
  @ApiOperation({ summary: 'Get confirmed lab tests history for a user' })
  getBookingHistory(@Param('userId') userId: string) {
    return this.labTestsService.getBookingHistoryByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Delete('cart/:bookingId')
  @ApiOperation({ summary: 'Remove a lab test from cart' })
  removeCartBooking(@Param('bookingId') bookingId: string) {
    return this.labTestsService.removeCartBooking(bookingId);
  }

}
