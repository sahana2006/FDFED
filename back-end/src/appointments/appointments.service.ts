import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';

export type AppointmentStatus = 'upcoming' | 'completed';

export type Appointment = {
  id: string;
  userId: string;
  doctorId: string;
  date: string;
  slot: string;
  status: AppointmentStatus;
};

export type CreateAppointmentInput = {
  userId: string;
  doctorId: string;
  date: string;
  slot: string;
};

export type UpdateAppointmentInput = {
  date?: string;
  slot?: string;
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
  ) {
    this.loadPersistedAppointments();
  }

  getAvailableSlots(doctorId: string, date: string): string[] {
    // If the doctor has marked the entire date as unavailable, return nothing
    if (this.doctorsService.isDateUnavailable(doctorId, date)) {
      return [];
    }

    const doctor = this.doctorsService.getDoctorById(doctorId);

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

  createAppointment(input: CreateAppointmentInput) {
    if (!input.userId || !input.doctorId || !input.date || !input.slot) {
      throw new BadRequestException(
        'userId, doctorId, date and slot are required',
      );
    }

    const doctor = this.doctorsService.getDoctorById(input.doctorId);
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
      date: input.date,
      slot: input.slot,
      status: 'upcoming',
    };

    this.appointments.unshift(appointment);
    this.persistAppointments();
    return this.toAppointmentDetails(appointment);
  }

  getUpcomingAppointments() {
    return this.appointments
      .filter((appointment) => appointment.status === 'upcoming')
      .map((appointment) => this.toAppointmentDetails(appointment));
  }

  listAppointments(input: ListAppointmentsInput = {}) {
    const normalizedStatus =
      input.status === 'upcoming' || input.status === 'completed'
        ? input.status
        : undefined;
    const normalizedUserId = input.userId?.trim();
    const normalizedDoctorId = input.doctorId?.trim();

    return this.appointments
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
      .map((appointment) => this.toAppointmentDetails(appointment));
  }

  getAppointmentsByUserId(userId: string, status?: string) {
    const normalizedStatus =
      status === 'upcoming' || status === 'completed' ? status : undefined;

    return this.appointments
      .filter((appointment) => {
        if (appointment.userId !== userId) {
          return false;
        }

        return normalizedStatus ? appointment.status === normalizedStatus : true;
      })
      .map((appointment) => this.toAppointmentDetails(appointment));
  }

  getCompletedAppointmentsByUserId(userId: string) {
    return this.appointments
      .filter(
        (appointment) =>
          appointment.userId === userId && appointment.status === 'completed',
      )
      .map((appointment) => this.toAppointmentDetails(appointment));
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

  completeAppointment(appointmentId: string) {
    const appointment = this.appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    appointment.status = 'completed';
    this.persistAppointments();
    return this.toAppointmentDetails(appointment);
  }

  updateAppointment(appointmentId: string, input: UpdateAppointmentInput) {
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

    const doctor = this.doctorsService.getDoctorById(appointment.doctorId);
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

  cancelAppointment(appointmentId: string) {
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

  private toAppointmentDetails(appointment: Appointment) {
    let doctor: any = null;
    try {
      doctor = this.doctorsService.getDoctorById(appointment.doctorId);
    } catch (_) {
      doctor = {
        id: appointment.doctorId,
        name: 'Unknown Doctor',
        specialization: '',
        department: '',
      };
    }
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
      doctor,
      patient,
    };
  }
}
