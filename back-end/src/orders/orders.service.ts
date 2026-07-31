import { BadRequestException, Injectable } from '@nestjs/common';
import { MedicinesService } from '../medicines/medicines.service';

export type OrderStatus = 'cart' | 'placed';

export type Order = {
  id: string;
  userId: string;
  medicineId: string;
  quantity: number;
  status: OrderStatus;
  cartId: string;
  orderId: string | null;
};

export type CreateOrderInput = {
  userId: string;
  medicineId: string;
  quantity: number;
};

export type UpdateCartOrderInput = {
  orderId: string;
  quantity: number;
};

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];
  private readonly activeCartIds = new Map<string, string>();

  constructor(private readonly medicinesService: MedicinesService) {}

  createOrder(input: CreateOrderInput) {
    if (!input.userId || !input.medicineId || input.quantity <= 0) {
      throw new BadRequestException('userId, medicineId and quantity are required');
    }

    const medicine = this.medicinesService.findById(input.medicineId);
    if (!medicine) {
      throw new BadRequestException('Medicine not found');
    }

    const existingOrder = this.orders.find(
      (item) =>
        item.userId === input.userId &&
        item.medicineId === input.medicineId &&
        item.status === 'cart',
    );

    if (existingOrder) {
      existingOrder.quantity += input.quantity;
      return this.toOrderDetails(existingOrder);
    }

    const order: Order = {
      id: `ORD${Date.now()}`,
      userId: input.userId,
      medicineId: input.medicineId,
      quantity: input.quantity,
      status: 'cart',
      cartId: this.getOrCreateActiveCartId(input.userId),
      orderId: null,
    };

    this.orders.unshift(order);
    return this.toOrderDetails(order);
  }

  getCartOrdersByUserId(userId: string) {
    return this.orders
      .filter((item) => item.userId === userId && item.status === 'cart')
      .map((item) => this.toOrderDetails(item));
  }

  placeCartOrdersByUserId(userId: string) {
    const cartOrders = this.orders.filter(
      (item) => item.userId === userId && item.status === 'cart',
    );

    if (!cartOrders.length) {
      throw new BadRequestException('Cart is empty');
    }

    const orderId = `ORDER${Date.now()}`;

    cartOrders.forEach((item) => {
      item.status = 'placed';
      item.orderId = orderId;
    });

    this.activeCartIds.delete(userId);

    return cartOrders.map((item) => this.toOrderDetails(item));
  }

  getPlacedOrdersByUserId(userId: string) {
    return this.orders
      .filter((item) => item.userId === userId && item.status === 'placed')
      .map((item) => this.toOrderDetails(item));
  }

  updateCartOrder(input: UpdateCartOrderInput) {
    if (!input.orderId || input.quantity <= 0) {
      throw new BadRequestException('orderId and a positive quantity are required');
    }

    const order = this.orders.find(
      (item) => item.id === input.orderId && item.status === 'cart',
    );
    if (!order) {
      throw new BadRequestException('Cart item not found');
    }

    order.quantity = input.quantity;
    return this.toOrderDetails(order);
  }

  removeCartOrder(orderId: string) {
    const orderIndex = this.orders.findIndex(
      (item) => item.id === orderId && item.status === 'cart',
    );
    if (orderIndex === -1) {
      throw new BadRequestException('Cart item not found');
    }

    const [removedOrder] = this.orders.splice(orderIndex, 1);
    const hasRemainingCartItems = this.orders.some(
      (item) => item.userId === removedOrder.userId && item.status === 'cart',
    );
    if (!hasRemainingCartItems) {
      this.activeCartIds.delete(removedOrder.userId);
    }

    return this.toOrderDetails(removedOrder);
  }

  private toOrderDetails(order: Order) {
    const medicine = this.medicinesService.findById(order.medicineId);
    if (!medicine) {
      throw new BadRequestException('Medicine not found');
    }

    return {
      ...order,
      medicine,
      totalPrice: Number((medicine.price * order.quantity).toFixed(2)),
    };
  }

  private getOrCreateActiveCartId(userId: string) {
    const existingCartOrder = this.orders.find(
      (item) => item.userId === userId && item.status === 'cart',
    );
    if (existingCartOrder) {
      this.activeCartIds.set(userId, existingCartOrder.cartId);
      return existingCartOrder.cartId;
    }

    const existingCartId = this.activeCartIds.get(userId);
    if (existingCartId) {
      return existingCartId;
    }

    const cartId = `CART${Date.now()}`;
    this.activeCartIds.set(userId, cartId);
    return cartId;
  }
}
