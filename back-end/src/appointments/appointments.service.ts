import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DoctorsService } from '../doctors/doctors.service';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';
import { LabRequestsService } from '../lab-requests/lab-requests.service';
import { LabTestsService, LabTest } from '../labtests/labtests.service';
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

export type LabEarningsEntry = {
  reportId: string;
  labRequestId: string;
  date: string;
  patientName: string;
  patientId: string;
  branchId: string;
  branchName: string;
  hospitalName: string;
  testName: string;
  testPrice: number;
  technicianName: string;
  sourceType?: 'doctor_order' | 'patient_labtest';
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
  completedLabTestsCount: number;
  totalLabTestRevenue: number;
  currentMonthLabTestRevenue: number;
  entries: EarningsEntry[];
  labEntries: LabEarningsEntry[];
};

export type PlatformEarningsSummary = BranchEarningsSummary & {
  totalBranchesWithRevenue: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  branches: Array<{
    branchId: string;
    hospitalName: string;
    branchName: string;
    completedAppointmentsCount: number;
    totalRevenue: number;
    currentMonthRevenue: number;
    totalDoctorCuts: number;
    branchProfit: number;
    totalLabTestRevenue: number;
    currentMonthLabTestRevenue: number;
  }>;
  recentPayments: Array<{
    appointmentId: string;
    branchId: string;
    branchName: string;
    hospitalName: string;
    doctorName: string;
    date: string;
    slot: string;
    consultationFee: number;
    doctorEarning: number;
    branchProfit: number;
  }>;
  recentLabPayments: Array<{
    reportId: string;
    labRequestId: string;
    branchId: string;
    branchName: string;
    hospitalName: string;
    testName: string;
    patientName: string;
    testPrice: number;
    date: string;
    technicianName: string;
    sourceType?: 'doctor_order' | 'patient_labtest';
  }>;
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
    @Inject(forwardRef(() => HospitalBranchService))
    private readonly hospitalBranchService: HospitalBranchService,
    @Inject(forwardRef(() => LabRequestsService))
    private readonly labRequestsService: LabRequestsService,
    @Inject(forwardRef(() => LabTestsService))
    private readonly labTestsService: LabTestsService,
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

  private normalizeLabTestName(name: string) {
    return String(name || '').trim().toLowerCase();
  }

  private getLabTestPriceByName(name: string): number {
    const target = this.normalizeLabTestName(name);
    if (!target) return 0;
    const test = this.labTestsService.findAllTests().find((item) => this.normalizeLabTestName(item.name) === target);
    return test?.price ?? 0;
  }

  private async buildLabEarningsEntries(): Promise<LabEarningsEntry[]> {
    const [branches, reports] = await Promise.all([
      this.hospitalBranchService.findAll(),
      Promise.resolve(this.labRequestsService.findAllReports()),
    ]);
    const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));

    return reports
      .filter((report) => report.status === 'submitted')
      .map((report) => {
        const branch = branchMap.get(report.branchId);
        const testPrice = this.getLabTestPriceByName(report.testName);
        return {
          reportId: report.id,
          labRequestId: report.labRequestId,
          date: report.submittedAt || report.updatedAt || report.createdAt || new Date().toISOString(),
          patientName: report.patientName || report.patientId,
          patientId: report.patientId,
          branchId: report.branchId,
          branchName: branch?.branchName ?? 'Unknown Branch',
          hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
          testName: report.testName,
          testPrice,
          technicianName: report.technicianName || 'Lab Technician',
          sourceType: report.sourceType,
        };
      });
  }

  private async buildLabEarningsForBranch(branchId: string): Promise<LabEarningsEntry[]> {
    const entries = await this.buildLabEarningsEntries();
    return entries.filter((entry) => entry.branchId === branchId);
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
    const labEntries = await this.buildLabEarningsForBranch(branchId);

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

    const currentMonthLabEntries = labEntries.filter((entry) => {
      const d = new Date(entry.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const sum = (arr: EarningsEntry[], key: keyof EarningsEntry) =>
      arr.reduce((s, e) => s + (e[key] as number), 0);

    const appointmentRevenue = sum(entries, 'consultationFee');
    const totalDoctorCuts = sum(entries, 'doctorEarning');
    const appointmentProfit = sum(entries, 'branchProfit');
    const labTestRevenue = labEntries.reduce((sumValue, entry) => sumValue + entry.testPrice, 0);
    const totalRevenue = appointmentRevenue + labTestRevenue;
    const branchProfit = appointmentProfit + labTestRevenue;
    const currentMonthAppointmentRevenue = sum(currentMonthEntries, 'consultationFee');
    const currentMonthDoctorCuts = sum(currentMonthEntries, 'doctorEarning');
    const currentMonthAppointmentProfit = sum(currentMonthEntries, 'branchProfit');
    const currentMonthLabTestRevenue = currentMonthLabEntries.reduce((sumValue, entry) => sumValue + entry.testPrice, 0);
    const currentMonthRevenue = currentMonthAppointmentRevenue + currentMonthLabTestRevenue;
    const currentMonthProfit = currentMonthAppointmentProfit + currentMonthLabTestRevenue;

    return {
      totalRevenue,
      totalDoctorCuts,
      branchProfit,
      currentMonthRevenue,
      currentMonthDoctorCuts,
      currentMonthProfit,
      completedAppointmentsCount: entries.length,
      completedLabTestsCount: labEntries.length,
      totalLabTestRevenue: labTestRevenue,
      currentMonthLabTestRevenue,
      entries,
      labEntries,
    };
  }

  async getEarningsForAllBranches(): Promise<PlatformEarningsSummary> {
    const branches = await this.hospitalBranchService.findAll();
    const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));
    const completed = this.appointments.filter((a) => a.status === 'completed');
    const labEntries = await this.buildLabEarningsEntries();
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
      const d = new Date(`${e.date}T00:00:00`);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const currentMonthLabEntries = labEntries.filter((entry) => {
      const d = new Date(entry.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const branchSummaries = Array.from(
      entries.reduce((acc, entry) => {
        const appointment = completed.find((item) => item.id === entry.appointmentId);
        const branchId = appointment?.branchId || 'unknown';
        const branch = branchMap.get(branchId);
        const current = acc.get(branchId) ?? {
          branchId,
          hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
          branchName: branch?.branchName ?? 'Unknown Branch',
          completedAppointmentsCount: 0,
          totalRevenue: 0,
          currentMonthRevenue: 0,
          totalDoctorCuts: 0,
          branchProfit: 0,
          totalLabTestRevenue: 0,
          currentMonthLabTestRevenue: 0,
        };

        current.completedAppointmentsCount += 1;
        current.totalRevenue += entry.consultationFee;
        current.totalDoctorCuts += entry.doctorEarning;
        current.branchProfit += entry.branchProfit;

        const entryDate = new Date(`${entry.date}T00:00:00`);
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          current.currentMonthRevenue += entry.consultationFee;
        }

        acc.set(branchId, current);
        return acc;
      }, new Map<string, {
        branchId: string;
        hospitalName: string;
        branchName: string;
        completedAppointmentsCount: number;
        totalRevenue: number;
        currentMonthRevenue: number;
        totalDoctorCuts: number;
        branchProfit: number;
        totalLabTestRevenue: number;
        currentMonthLabTestRevenue: number;
      }>()),
    ).map(([, summary]) => summary).sort((a, b) => b.totalRevenue - a.totalRevenue);

    for (const labEntry of labEntries) {
      const current = branchSummaries.find((summary) => summary.branchId === labEntry.branchId);
      const entryDate = new Date(labEntry.date);
      const isCurrentMonth = entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      if (!current) {
        const branch = branchMap.get(labEntry.branchId);
        branchSummaries.push({
          branchId: labEntry.branchId,
          hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
          branchName: branch?.branchName ?? 'Unknown Branch',
          completedAppointmentsCount: 0,
          totalRevenue: labEntry.testPrice,
          currentMonthRevenue: isCurrentMonth ? labEntry.testPrice : 0,
          totalDoctorCuts: 0,
          branchProfit: labEntry.testPrice,
          totalLabTestRevenue: labEntry.testPrice,
          currentMonthLabTestRevenue: isCurrentMonth ? labEntry.testPrice : 0,
        });
        continue;
      }
      current.completedAppointmentsCount += 0;
      current.totalRevenue += labEntry.testPrice;
      current.branchProfit += labEntry.testPrice;
      current.totalLabTestRevenue += labEntry.testPrice;
      if (isCurrentMonth) {
        current.currentMonthRevenue += labEntry.testPrice;
        current.currentMonthLabTestRevenue += labEntry.testPrice;
      }
    }

    const recentPayments = [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((entry) => {
        const appointment = completed.find((item) => item.id === entry.appointmentId);
        const branch = branchMap.get(appointment?.branchId || '');
        return {
          appointmentId: entry.appointmentId,
          branchId: appointment?.branchId || '',
          branchName: branch?.branchName ?? 'Unknown Branch',
          hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
          doctorName: entry.doctorName,
          date: entry.date,
          slot: entry.slot,
          consultationFee: entry.consultationFee,
          doctorEarning: entry.doctorEarning,
          branchProfit: entry.branchProfit,
        };
      });

    const recentLabPayments = [...labEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((entry) => ({
        reportId: entry.reportId,
        labRequestId: entry.labRequestId,
        branchId: entry.branchId,
        branchName: entry.branchName,
        hospitalName: entry.hospitalName,
        testName: entry.testName,
        patientName: entry.patientName,
        testPrice: entry.testPrice,
        date: entry.date,
        technicianName: entry.technicianName,
        sourceType: entry.sourceType,
      }));

    const totalAppointmentRevenue = entries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const totalDoctorCuts = entries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const appointmentBranchProfit = entries.reduce((sum, entry) => sum + entry.branchProfit, 0);
    const totalLabTestRevenue = labEntries.reduce((sum, entry) => sum + entry.testPrice, 0);
    const totalRevenue = totalAppointmentRevenue + totalLabTestRevenue;
    const branchProfit = appointmentBranchProfit + totalLabTestRevenue;
    const currentMonthAppointmentRevenue = currentMonthEntries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const currentMonthDoctorCuts = currentMonthEntries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const currentMonthAppointmentProfit = currentMonthEntries.reduce((sum, entry) => sum + entry.branchProfit, 0);
    const currentMonthLabTestRevenue = currentMonthLabEntries.reduce((sum, entry) => sum + entry.testPrice, 0);
    const currentMonthRevenue = currentMonthAppointmentRevenue + currentMonthLabTestRevenue;
    const currentMonthProfit = currentMonthAppointmentProfit + currentMonthLabTestRevenue;

    return {
      totalRevenue: totalRevenue,
      totalDoctorCuts,
      branchProfit,
      currentMonthRevenue,
      currentMonthDoctorCuts,
      currentMonthProfit,
      completedAppointmentsCount: entries.length,
      completedLabTestsCount: labEntries.length,
      totalLabTestRevenue,
      currentMonthLabTestRevenue,
      entries,
      labEntries,
      totalBranchesWithRevenue: branchSummaries.length,
      branches: branchSummaries,
      recentPayments,
      recentLabPayments,
      totalEarnings: totalRevenue,
      thisMonthEarnings: currentMonthRevenue,
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

