import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateCartOrderDto } from './dto/orders.dto';

@ApiTags('Orders')
@ApiHeader({ name: 'role', required: false, description: 'User role (admin, doctor, patient, frontdesk)' })
@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('patient', 'frontdesk', 'admin')
  @Post()
  @ApiOperation({ summary: 'Add a medicine to cart' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order added to cart successfully' })
  createOrder(@Body() body: CreateOrderDto) {
    return this.ordersService.createOrder({
      userId: body.userId.trim(),
      medicineId: body.medicineId.trim(),
      quantity: Number(body.quantity),
    });
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('cart/:userId')
  @ApiOperation({ summary: 'Get current cart for a user' })
  getCartOrdersByUserId(@Param('userId') userId: string) {
    return this.ordersService.getCartOrdersByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Post('place/:userId')
  @ApiOperation({ summary: 'Place order for all items in the cart' })
  placeCartOrdersByUserId(@Param('userId') userId: string) {
    return this.ordersService.placeCartOrdersByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Get('history/:userId')
  @ApiOperation({ summary: 'Get order history for a user' })
  getPlacedOrdersByUserId(@Param('userId') userId: string) {
    return this.ordersService.getPlacedOrdersByUserId(userId);
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Put('cart/:orderId')
  @ApiOperation({ summary: 'Update quantity of an order in cart' })
  @ApiBody({ type: UpdateCartOrderDto })
  updateCartOrder(
    @Param('orderId') orderId: string,
    @Body() body: UpdateCartOrderDto,
  ) {
    return this.ordersService.updateCartOrder({
      orderId,
      quantity: Number(body.quantity),
    });
  }

  @Roles('patient', 'frontdesk', 'admin')
  @Delete('cart/:orderId')
  @ApiOperation({ summary: 'Remove an order from cart' })
  removeCartOrder(@Param('orderId') orderId: string) {
    return this.ordersService.removeCartOrder(orderId);
  }
}
