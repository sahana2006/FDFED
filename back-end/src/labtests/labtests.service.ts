import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LabRequestsService } from '../lab-requests/lab-requests.service';

export type LabTest = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
};

export type TestBookingStatus = 'cart' | 'booked';

export type TestBooking = {
  id: string;
  userId: string;
  labTestId: string;
  branchId: string;
  status: TestBookingStatus;
  cartId: string;
  orderId: string | null;
};

export type CreateTestBookingInput = {
  userId: string;
  labTestId: string;
  branchId: string;
};

type LabTestsState = {
  testBookings: TestBooking[];
};

const LABTESTS_DATA_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'labtests.json',
);

@Injectable()
export class LabTestsService {
  private readonly labTests: LabTest[] = [
    {
      id: 'LAB001',
      name: 'Prime Full Body Checkup',
      price: 1549,
      category: 'Full Body Check Up',
      description: 'Comprehensive preventive health screening package.',
    },
    {
      id: 'LAB002',
      name: 'Xpert Regular Full Body Health Checkup',
      price: 1079,
      category: 'Full Body Check Up',
      description: 'Routine full body screening with essential health markers.',
    },
    {
      id: 'LAB003',
      name: 'HbA1c Test',
      price: 649,
      category: 'Diabetes',
      description: 'Measures average blood sugar levels over the last 2 to 3 months.',
    },
    {
      id: 'LAB004',
      name: 'Fasting Blood Sugar Test',
      price: 100,
      category: 'Diabetes',
      description: 'Checks your fasting glucose level for diabetes screening.',
    },
    {
      id: 'LAB005',
      name: 'CBC Test',
      price: 419,
      category: 'Blood Studies',
      description: 'Complete blood count to assess overall blood health.',
    },
    {
      id: 'LAB006',
      name: 'Lipid Profile Test',
      price: 829,
      category: 'Heart',
      description: 'Measures cholesterol and triglycerides for cardiac risk review.',
    },
  ];

  private testBookings: TestBooking[] = [];
  private readonly activeCartIds = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => LabRequestsService))
    private readonly labRequestsService: LabRequestsService,
  ) {
    this.loadPersistedState();
  }

  findAllTests(): LabTest[] {
    return this.labTests.map((test) => ({ ...test }));
  }

  createBooking(input: CreateTestBookingInput) {
    if (!input.userId || !input.labTestId || !input.branchId) {
      throw new BadRequestException('userId, labTestId and branchId are required');
    }

    const labTest = this.findTestById(input.labTestId);
    if (!labTest) {
      throw new BadRequestException('Lab test not found');
    }

    const existingBooking = this.testBookings.find(
      (booking) =>
        booking.userId === input.userId &&
        booking.labTestId === input.labTestId &&
        booking.branchId === input.branchId &&
        booking.status === 'cart',
    );

    if (existingBooking) {
      return this.toBookingDetails(existingBooking);
    }

    const booking: TestBooking = {
      id: `TBOOK${Date.now()}`,
      userId: input.userId,
      labTestId: input.labTestId,
      branchId: input.branchId,
      status: 'cart',
      cartId: this.getOrCreateActiveCartId(input.userId),
      orderId: null,
    };

    this.testBookings.unshift(booking);
    this.persistState();
    return this.toBookingDetails(booking);
  }

  getCartBookingsByUserId(userId: string) {
    return this.testBookings
      .filter((booking) => booking.userId === userId && booking.status === 'cart')
      .map((booking) => this.toBookingDetails(booking));
  }

  confirmBookingsByUserId(userId: string, context?: { patientName?: string }) {
    const cartBookings = this.testBookings.filter(
      (booking) => booking.userId === userId && booking.status === 'cart',
    );

    if (!cartBookings.length) {
      throw new BadRequestException('Lab cart is empty');
    }

    const orderId = `LABORD${Date.now()}`;

    cartBookings.forEach((booking) => {
      booking.status = 'booked';
      booking.orderId = orderId;

      const labTest = this.findTestById(booking.labTestId);
      if (labTest) {
        this.labRequestsService.createDirectPatientRequest({
          sourceBookingId: booking.id,
          orderId,
          patientId: booking.userId,
          patientName: context?.patientName?.trim() || booking.userId,
          branchId: booking.branchId,
          testName: labTest.name,
          requestDate: new Date().toISOString().split('T')[0],
        });
      }
    });

    this.activeCartIds.delete(userId);
    this.persistState();

    return cartBookings.map((booking) => this.toBookingDetails(booking));
  }

  getBookingHistoryByUserId(userId: string) {
    return this.testBookings
      .filter((booking) => booking.userId === userId && booking.status === 'booked')
      .map((booking) => this.toBookingDetails(booking));
  }

  removeCartBooking(bookingId: string) {
    const bookingIndex = this.testBookings.findIndex(
      (booking) => booking.id === bookingId && booking.status === 'cart',
    );
    if (bookingIndex === -1) {
      throw new BadRequestException('Cart test not found');
    }

    const [removedBooking] = this.testBookings.splice(bookingIndex, 1);
    const hasRemainingCartBookings = this.testBookings.some(
      (booking) => booking.userId === removedBooking.userId && booking.status === 'cart',
    );
    if (!hasRemainingCartBookings) {
      this.activeCartIds.delete(removedBooking.userId);
    }

    this.persistState();
    return this.toBookingDetails(removedBooking);
  }

  private findTestById(id: string): LabTest | undefined {
    const test = this.labTests.find((item) => item.id === id);
    return test ? { ...test } : undefined;
  }

  private toBookingDetails(booking: TestBooking) {
    const labTest = this.findTestById(booking.labTestId);
    if (!labTest) {
      throw new BadRequestException('Lab test not found');
    }

    return {
      ...booking,
      labTest,
    };
  }

  private getOrCreateActiveCartId(userId: string) {
    const existingCartBooking = this.testBookings.find(
      (booking) => booking.userId === userId && booking.status === 'cart',
    );
    if (existingCartBooking) {
      this.activeCartIds.set(userId, existingCartBooking.cartId);
      return existingCartBooking.cartId;
    }

    const existingCartId = this.activeCartIds.get(userId);
    if (existingCartId) {
      return existingCartId;
    }

    const cartId = `LABCART${Date.now()}`;
    this.activeCartIds.set(userId, cartId);
    return cartId;
  }

  private loadPersistedState() {
    try {
      if (!existsSync(LABTESTS_DATA_FILE)) {
        return;
      }

      const saved = JSON.parse(readFileSync(LABTESTS_DATA_FILE, 'utf8')) as Partial<LabTestsState>;
      if (Array.isArray(saved.testBookings)) {
        this.testBookings = saved.testBookings;
      }
    } catch (_) {}
  }

  private persistState() {
    mkdirSync(dirname(LABTESTS_DATA_FILE), { recursive: true });
    writeFileSync(
      LABTESTS_DATA_FILE,
      JSON.stringify(
        {
          testBookings: this.testBookings,
        },
        null,
        2,
      ),
    );
  }
}
