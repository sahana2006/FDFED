import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DoctorsService } from '../doctors/doctors.service';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';
import { PatientsService } from '../patients/patients.service';

export type AppointmentStatus = 'upcoming' | 'completed';

export type Appointment = {
  id: string;
  userId: string;
  doctorId: string;
  branchId: string;
  branch?: HospitalBranch;
  date: string;
  slot: string;
  status: AppointmentStatus;
  bookedBy?: string;
  bookedByRole?: string;
  source?: string;
  frontdeskId?: string;
};

export type CreateAppointmentInput = {
  userId: string;
  doctorId: string;
  branchId: string;
  date: string;
  slot: string;
  bookedBy?: string;
  bookedByRole?: string;
  source?: string;
  frontdeskId?: string;
};

export type UpdateAppointmentInput = {
  date?: string;
  slot?: string;
};

export type EarningsEntry = {
  appointmentId: string;
  date: string;
  slot: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  consultationFee: number;
  percentageCut: number;
  doctorEarning: number;
  branchProfit: number;
};

export type DoctorEarningsSummary = {
  doctorId: string;
  doctorName: string;
  percentageCut: number;
  totalEarnings: number;
  currentMonthEarnings: number;
  entries: EarningsEntry[];
};

export type BranchEarningsSummary = {
  totalRevenue: number;
  totalDoctorCuts: number;
  branchProfit: number;
  currentMonthRevenue: number;
  currentMonthDoctorCuts: number;
  currentMonthProfit: number;
  completedAppointmentsCount: number;
  entries: EarningsEntry[];
};

export type ListAppointmentsInput = {
  userId?: string;
  doctorId?: string;
  status?: string;
};

const APPOINTMENTS_DATA_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'appointments.json',
);

@Injectable()
export class AppointmentsService {
  private appointments: Appointment[] = []; 

  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {
    this.loadPersistedAppointments();
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    // If the doctor has marked the entire date as unavailable, return nothing
    if (this.doctorsService.isDateUnavailable(doctorId, date)) {
      return [];
    }

    const doctor = await this.doctorsService.getDoctorById(doctorId);

    // Collect slots already booked by patients
    const bookedSlots = new Set(
      this.appointments
        .filter(
          (appointment) =>
            appointment.doctorId === doctorId && appointment.date === date,
        )
        .map((appointment) => appointment.slot),
    );

    // Collect slots explicitly blocked by the doctor for this date
    const doctorBlockedSlots = this.doctorsService.getBlockedSlotTimesForDate(
      doctorId,
      date,
    );

    return doctor.slots.filter(
      (slot) => !bookedSlots.has(slot) && !doctorBlockedSlots.has(slot),
    );
  }

  async createAppointment(input: CreateAppointmentInput) {
    if (!input.userId || !input.doctorId || !input.branchId || !input.date || !input.slot) {
      throw new BadRequestException(
        'userId, doctorId, branchId, date and slot are required',
      );
    }

    const branchId = input.branchId.trim();
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    const branch = await this.hospitalBranchService.findOne(branchId);
    const doctor = await this.doctorsService.getDoctorById(input.doctorId);

    if (doctor.branchId !== branchId) {
      throw new BadRequestException('Doctor does not belong to the selected hospital branch');
    }

    if (!doctor.slots.includes(input.slot)) {
      throw new BadRequestException('Invalid doctor slot');
    }

    // Reject booking on a fully-unavailable date
    if (this.doctorsService.isDateUnavailable(input.doctorId, input.date)) {
      throw new BadRequestException(
        'The doctor is not available on this date',
      );
    }

    // Reject booking on a doctor-blocked slot
    const blockedSlots = this.doctorsService.getBlockedSlotTimesForDate(
      input.doctorId,
      input.date,
    );
    if (blockedSlots.has(input.slot)) {
      throw new BadRequestException('This slot has been blocked by the doctor');
    }

    const isAlreadyBooked = this.appointments.some(
      (appointment) =>
        appointment.doctorId === input.doctorId &&
        appointment.date === input.date &&
        appointment.slot === input.slot,
    );
    if (isAlreadyBooked) {
      throw new BadRequestException('This slot is already booked');
    }

    const appointment: Appointment = {
      id: `APT${Date.now()}`,
      userId: input.userId,
      doctorId: input.doctorId,
      branchId,
      branch,
      date: input.date,
      slot: input.slot,
      status: 'upcoming',
      bookedBy: input.bookedBy || input.bookedByRole || (input.frontdeskId ? 'frontdesk' : 'patient'),
      bookedByRole: input.bookedByRole || (input.frontdeskId ? 'frontdesk' : 'patient'),
      source: input.source || (input.bookedByRole === 'frontdesk' || input.frontdeskId ? 'frontdesk' : 'patient'),
      frontdeskId: input.frontdeskId,
    };

    this.appointments.unshift(appointment);
    this.persistAppointments();
    return this.toAppointmentDetails(appointment);
  }

  async getUpcomingAppointments() {
    return Promise.all(
      this.appointments
        .filter((appointment) => appointment.status === 'upcoming')
        .map((appointment) => this.toAppointmentDetails(appointment))
    );
  }

  async listAppointments(input: ListAppointmentsInput = {}) {
    const normalizedStatus =
      input.status === 'upcoming' || input.status === 'completed'
        ? input.status
        : undefined;
    const normalizedUserId = input.userId?.trim();
    const normalizedDoctorId = input.doctorId?.trim();

    return Promise.all(
      this.appointments
        .filter((appointment) => {
          if (normalizedUserId && appointment.userId !== normalizedUserId) {
            return false;
          }

          if (normalizedDoctorId && appointment.doctorId !== normalizedDoctorId) {
            return false;
          }

          if (normalizedStatus && appointment.status !== normalizedStatus) {
            return false;
          }

          return true;
        })
        .map((appointment) => this.toAppointmentDetails(appointment))
    );
  }

  async getAppointmentsByUserId(userId: string, status?: string) {
    const normalizedStatus =
      status === 'upcoming' || status === 'completed' ? status : undefined;

    return Promise.all(
      this.appointments
        .filter((appointment) => {
          if (appointment.userId !== userId) {
            return false;
          }

          return normalizedStatus ? appointment.status === normalizedStatus : true;
        })
        .map((appointment) => this.toAppointmentDetails(appointment))
    );
  }

  async getCompletedAppointmentsByUserId(userId: string) {
    return Promise.all(
      this.appointments
        .filter(
          (appointment) =>
            appointment.userId === userId && appointment.status === 'completed',
        )
        .map((appointment) => this.toAppointmentDetails(appointment))
    );
  }

  getAppointmentsByDoctorId(doctorId: string) {
    return this.listAppointments({ doctorId });
  }

  hasUpcomingAppointment(
    userId: string,
    doctorId: string,
    date: string,
  ): boolean {
    return this.appointments.some(
      (appointment) =>
        appointment.userId === userId &&
        appointment.doctorId === doctorId &&
        appointment.date === date &&
        appointment.status === 'upcoming',
    );
  }

  hasCompletedAppointment(userId: string, doctorId: string): boolean {
    return this.appointments.some(
      (appointment) =>
        appointment.userId === userId &&
        appointment.doctorId === doctorId &&
        appointment.status === 'completed',
    );
  }

  async getAppointmentById(appointmentId: string) {
    const appointment = this.appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      return null;
    }
    return this.toAppointmentDetails(appointment);
  }

  async completeAppointment(appointmentId: string) {
    const appointment = this.appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    appointment.status = 'completed';
    this.persistAppointments();
    return this.toAppointmentDetails(appointment);
  }

  async updateAppointment(appointmentId: string, input: UpdateAppointmentInput) {
    const appointment = this.appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    if (appointment.status !== 'upcoming') {
      throw new BadRequestException('Only upcoming appointments can be modified');
    }

    const nextDate = input.date?.trim() || appointment.date;
    const nextSlot = input.slot?.trim() || appointment.slot;
    if (!nextDate || !nextSlot) {
      throw new BadRequestException('date and slot are required');
    }

    const doctor = await this.doctorsService.getDoctorById(appointment.doctorId);
    if (!doctor.slots.includes(nextSlot)) {
      throw new BadRequestException('Invalid doctor slot');
    }

    const isAlreadyBooked = this.appointments.some(
      (item) =>
        item.id !== appointmentId &&
        item.doctorId === appointment.doctorId &&
        item.date === nextDate &&
        item.slot === nextSlot,
    );
    if (isAlreadyBooked) {
      throw new BadRequestException('This slot is already booked');
    }

    appointment.date = nextDate;
    appointment.slot = nextSlot;
    this.persistAppointments();

    return this.toAppointmentDetails(appointment);
  }

  async cancelAppointment(appointmentId: string) {
    const appointmentIndex = this.appointments.findIndex(
      (item) => item.id === appointmentId,
    );
    if (appointmentIndex === -1) {
      throw new BadRequestException('Appointment not found');
    }

    const appointment = this.appointments[appointmentIndex];
    if (appointment.status !== 'upcoming') {
      throw new BadRequestException('Only upcoming appointments can be cancelled');
    }

    const [cancelledAppointment] = this.appointments.splice(appointmentIndex, 1);
    this.persistAppointments();
    return this.toAppointmentDetails(cancelledAppointment);
  }

  private loadPersistedAppointments() {
    try {
      if (!existsSync(APPOINTMENTS_DATA_FILE)) {
        return;
      }

      const saved = JSON.parse(readFileSync(APPOINTMENTS_DATA_FILE, 'utf8'));
      if (Array.isArray(saved)) {
        this.appointments = saved;
      }
    } catch (_) {}
  }

  private persistAppointments() {
    mkdirSync(dirname(APPOINTMENTS_DATA_FILE), { recursive: true });
    writeFileSync(
      APPOINTMENTS_DATA_FILE,
      JSON.stringify(this.appointments, null, 2),
    );
  }

  async getEarningsForDoctor(doctorId: string): Promise<DoctorEarningsSummary> {
    const doctor = await this.doctorsService.getDoctorById(doctorId);
    const completed = this.appointments.filter(
      (a) => a.doctorId === doctorId && a.status === 'completed',
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const entries: EarningsEntry[] = completed.map((a) => {
      const fee = doctor.consultationFee || 0;
      const cut = doctor.percentageCut || 0;
      const doctorEarning = (fee * cut) / 100;
      const branchProfit = fee - doctorEarning;

      let patientName = a.userId;
      try {
        const p = this.patientsService.getPatientByUserId(a.userId);
        patientName = `${p.firstName} ${p.lastName}`.trim() || a.userId;
      } catch (_) {}

      return {
        appointmentId: a.id,
        date: a.date,
        slot: a.slot,
        patientName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        consultationFee: fee,
        percentageCut: cut,
        doctorEarning,
        branchProfit,
      };
    });

    const currentMonthEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      percentageCut: doctor.percentageCut || 0,
      totalEarnings: entries.reduce((s, e) => s + e.doctorEarning, 0),
      currentMonthEarnings: currentMonthEntries.reduce((s, e) => s + e.doctorEarning, 0),
      entries,
    };
  }

  async getEarningsForBranch(branchId: string): Promise<BranchEarningsSummary> {
    const completed = this.appointments.filter(
      (a) => a.branchId === branchId && a.status === 'completed',
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const entries: EarningsEntry[] = await Promise.all(
      completed.map(async (a) => {
        let doctor: any = { id: a.doctorId, name: 'Unknown', consultationFee: 0, percentageCut: 0 };
        try {
          doctor = await this.doctorsService.getDoctorById(a.doctorId);
        } catch (_) {}

        const fee = doctor.consultationFee || 0;
        const cut = doctor.percentageCut || 0;
        const doctorEarning = (fee * cut) / 100;
        const branchProfit = fee - doctorEarning;

        let patientName = a.userId;
        try {
          const p = this.patientsService.getPatientByUserId(a.userId);
          patientName = `${p.firstName} ${p.lastName}`.trim() || a.userId;
        } catch (_) {}

        return {
          appointmentId: a.id,
          date: a.date,
          slot: a.slot,
          patientName,
          doctorId: doctor.id,
          doctorName: doctor.name,
          consultationFee: fee,
          percentageCut: cut,
          doctorEarning,
          branchProfit,
        };
      }),
    );

    const currentMonthEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const sum = (arr: EarningsEntry[], key: keyof EarningsEntry) =>
      arr.reduce((s, e) => s + (e[key] as number), 0);

    return {
      totalRevenue: sum(entries, 'consultationFee'),
      totalDoctorCuts: sum(entries, 'doctorEarning'),
      branchProfit: sum(entries, 'branchProfit'),
      currentMonthRevenue: sum(currentMonthEntries, 'consultationFee'),
      currentMonthDoctorCuts: sum(currentMonthEntries, 'doctorEarning'),
      currentMonthProfit: sum(currentMonthEntries, 'branchProfit'),
      completedAppointmentsCount: entries.length,
      entries,
    };
  }

  private async toAppointmentDetails(appointment: Appointment) {
    let doctor: any = null;
    try {
      doctor = await this.doctorsService.getDoctorById(appointment.doctorId);
    } catch (_) {
      doctor = {
        id: appointment.doctorId,
        name: 'Unknown Doctor',
        specialization: '',
        department: '',
      };
    }

    const branchId = appointment.branchId || doctor?.branchId || '';
    const branch: HospitalBranch | undefined = appointment.branch;

    let patient: Record<string, string> | null = null;

    try {
      const patientProfile = this.patientsService.getPatientByUserId(appointment.userId);
      patient = {
        userId: patientProfile.userId,
        firstName: patientProfile.firstName,
        lastName: patientProfile.lastName,
        name: `${patientProfile.firstName} ${patientProfile.lastName}`.trim(),
        gender: patientProfile.gender,
        dob: patientProfile.dob,
        phone: patientProfile.phone,
        email: patientProfile.email,
      };
    } catch (_) {
      patient = {
        userId: appointment.userId,
        name: appointment.userId,
      };
    }

    return {
      ...appointment,
      branchId,
      branch,
      doctor,
      patient,
    };
  }
}

