import { Module } from '@nestjs/common';
import { MedicinesModule } from '../medicines/medicines.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MedicinesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
