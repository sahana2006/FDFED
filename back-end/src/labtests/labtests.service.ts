import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type LabTest = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
};

export type TestBookingStatus = 'cart' | 'booked';
export type LabAssignmentStatus = 'assigned';

export type TestBooking = {
  id: string;
  userId: string;
  labTestId: string;
  status: TestBookingStatus;
  cartId: string;
  orderId: string | null;
};

export type LabAssignment = {
  id: string;
  userId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  packageName: string;
  tests: string[];
  remarks: string;
  date: string;
  status: LabAssignmentStatus;
};

export type CreateTestBookingInput = {
  userId: string;
  labTestId: string;
};

export type CreateLabAssignmentInput = {
  userId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  packageName?: string;
  tests: string[];
  remarks?: string;
};

export type UpdateLabAssignmentInput = {
  userId?: string;
  patientName?: string;
  packageName?: string;
  tests?: string[];
  remarks?: string;
};

type LabTestsState = {
  testBookings: TestBooking[];
  labAssignments: LabAssignment[];
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
  private labAssignments: LabAssignment[] = [];
  private readonly activeCartIds = new Map<string, string>();

  constructor() {
    this.loadPersistedState();
  }

  findAllTests(): LabTest[] {
    return this.labTests.map((test) => ({ ...test }));
  }

  createBooking(input: CreateTestBookingInput) {
    if (!input.userId || !input.labTestId) {
      throw new BadRequestException('userId and labTestId are required');
    }

    const labTest = this.findTestById(input.labTestId);
    if (!labTest) {
      throw new BadRequestException('Lab test not found');
    }

    const existingBooking = this.testBookings.find(
      (booking) =>
        booking.userId === input.userId &&
        booking.labTestId === input.labTestId &&
        booking.status === 'cart',
    );

    if (existingBooking) {
      return this.toBookingDetails(existingBooking);
    }

    const booking: TestBooking = {
      id: `TBOOK${Date.now()}`,
      userId: input.userId,
      labTestId: input.labTestId,
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

  confirmBookingsByUserId(userId: string) {
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

  createLabAssignment(input: CreateLabAssignmentInput) {
    const tests = this.cleanTests(input.tests);
    if (!input.userId || !input.patientName || !input.doctorId || !tests.length) {
      throw new BadRequestException(
        'userId, patientName, doctorId and tests are required',
      );
    }

    const assignment: LabAssignment = {
      id: `LABASSIGN${Date.now()}`,
      userId: input.userId,
      patientName: input.patientName,
      doctorId: input.doctorId,
      doctorName: input.doctorName?.trim() || 'Doctor',
      packageName: input.packageName?.trim() || 'Lab Test Package',
      tests,
      remarks: input.remarks?.trim() || '',
      date: new Date().toISOString().split('T')[0],
      status: 'assigned',
    };

    this.labAssignments.unshift(assignment);
    this.persistState();
    return { ...assignment, tests: [...assignment.tests] };
  }

  getAssignmentsByUserId(userId: string) {
    return this.labAssignments
      .filter((assignment) => assignment.userId === userId)
      .map((assignment) => ({ ...assignment, tests: [...assignment.tests] }));
  }

  getAssignmentsByDoctorId(doctorId: string) {
    return this.labAssignments
      .filter((assignment) => assignment.doctorId === doctorId)
      .map((assignment) => ({ ...assignment, tests: [...assignment.tests] }));
  }

  updateLabAssignment(assignmentId: string, input: UpdateLabAssignmentInput) {
    const assignment = this.labAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new BadRequestException('Assigned lab test not found');
    }

    if (input.userId?.trim()) assignment.userId = input.userId.trim();
    if (input.patientName?.trim()) assignment.patientName = input.patientName.trim();
    if (input.packageName !== undefined) {
      assignment.packageName = input.packageName.trim() || 'Lab Test Package';
    }
    if (input.remarks !== undefined) assignment.remarks = input.remarks.trim();
    if (input.tests) {
      const tests = this.cleanTests(input.tests);
      if (!tests.length) {
        throw new BadRequestException('At least one test is required');
      }
      assignment.tests = tests;
    }

    this.persistState();
    return { ...assignment, tests: [...assignment.tests] };
  }

  deleteLabAssignment(assignmentId: string) {
    const assignmentIndex = this.labAssignments.findIndex(
      (item) => item.id === assignmentId,
    );
    if (assignmentIndex === -1) {
      throw new BadRequestException('Assigned lab test not found');
    }

    const [deletedAssignment] = this.labAssignments.splice(assignmentIndex, 1);
    this.persistState();
    return { ...deletedAssignment, tests: [...deletedAssignment.tests] };
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

  private cleanTests(tests: string[]) {
    return [...new Set((tests || []).map((test) => test.trim()).filter(Boolean))];
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
      if (Array.isArray(saved.labAssignments)) {
        this.labAssignments = saved.labAssignments;
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
          labAssignments: this.labAssignments,
        },
        null,
        2,
      ),
    );
  }
}
