import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RequestContextService } from '../common/request-context.service';
import { UsersService } from '../users/users.service';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';
import { DoctorEntity } from './entities/doctor.entity';

export type Doctor = {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  branchId: string;
  branch?: HospitalBranch;
  department: string;
  qualification: string;
  experience: number;
  age: number;
  gender: string;
  email: string;
  phone: string;
  licenseNo: string;
  bio: string;
  slots: string[];
  consultationFee?: number;
  percentageCut?: number;
};

/**
 * A doctor-blocked time slot on a specific date.
 * Blocked slots will be hidden from patients when booking appointments.
 */
export type SlotBlock = {
  id: string;
  doctorId: string;
  date: string;  // YYYY-MM-DD
  slot: string;  // HH:MM (24-hour, matches Doctor.slots)
  reason?: string;
};

/**
 * An entire date marked unavailable by a doctor.
 * When a date is fully unavailable, NO slots are offered to patients.
 */
export type UnavailableDate = {
  id: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
};

export type CreateSlotBlockInput = {
  date: string;
  slot: string;
  reason?: string;
};

export type CreateDoctorInput = {
  name: string;
  email: string;
  password: string;
  specialization: string;
  branchId: string;
  slots: string[];
  department?: string;
  qualification?: string;
  experience?: number;
  age?: number;
  gender?: string;
  phone?: string;
  licenseNo?: string;
  bio?: string;
  consultationFee?: number;
  percentageCut?: number;
};

export type UpdateDoctorInput = Partial<Omit<CreateDoctorInput, 'password'>>;

const SLOT_BLOCKS_FILE = join(__dirname, '..', '..', 'data', 'slot-blocks.json');
const UNAVAILABLE_DATES_FILE = join(__dirname, '..', '..', 'data', 'unavailable-dates.json');
const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

/** Map a DoctorEntity row to the plain Doctor DTO */
function toDoctor(e: DoctorEntity): Doctor {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    specialization: e.specialization,
    branchId: e.branchId,
    department: e.department,
    qualification: e.qualification,
    experience: e.experience,
    age: e.age,
    gender: e.gender,
    email: e.email,
    phone: e.phone,
    licenseNo: e.licenseNo,
    bio: e.bio,
    slots: Array.isArray(e.slots) ? [...e.slots] : [],
    consultationFee: Number(e.consultationFee) || 0,
    percentageCut: Number(e.percentageCut) || 0,
  };
}

@Injectable()
export class DoctorsService implements OnModuleInit {
  // ─── In-memory slot management stores (still JSON-file backed) ──────────────
  private slotBlocks: SlotBlock[] = [];
  private unavailableDates: UnavailableDate[] = [];

  constructor(
    @InjectRepository(DoctorEntity)
    private readonly doctorRepository: Repository<DoctorEntity>,
    private readonly usersService: UsersService,
    private readonly hospitalBranchService: HospitalBranchService,
    private readonly requestContextService: RequestContextService,
  ) {}

  onModuleInit(): void {
    this.loadSlotBlocks();
    this.loadUnavailableDates();
  }

  private getScopedBranchId(): string | undefined {
    return this.requestContextService.getContext()?.branchId;
  }

  private ensureBranchAccess(branchId: string): void {
    const scopedBranchId = this.getScopedBranchId();
    if (scopedBranchId && branchId !== scopedBranchId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
  }

  // ─── Doctor lookup ────────────────────────────────────────────────────────────

  async findAll(specialization?: string, branchId?: string): Promise<Doctor[]> {
    const scopedBranchId = this.getScopedBranchId();
    const where: Record<string, unknown> = { isActive: true };
    if (specialization?.trim()) where.specialization = specialization.trim();
    const requestedBranchId = branchId?.trim();
    if (requestedBranchId) where.branchId = requestedBranchId;
    if (scopedBranchId) where.branchId = scopedBranchId;
    const rows = await this.doctorRepository.find({ where });
    return rows.map(toDoctor);
  }

  async getDoctorById(doctorId: string): Promise<Doctor> {
    const row = await this.doctorRepository.findOne({
      where: [{ id: doctorId }, { userId: doctorId }],
    });
    if (!row) throw new NotFoundException('Doctor not found');
    this.ensureBranchAccess(row.branchId ?? DEFAULT_BRANCH_ID);
    return toDoctor(row);
  }

  async createDoctor(input: CreateDoctorInput): Promise<Doctor> {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const specialization = input.specialization?.trim();
    const slots = this.normalizeSlots(input.slots);

    if (!name || !email || !input.password || !specialization) {
      throw new BadRequestException('name, email, password and specialization are required');
    }
    if (slots.length === 0) throw new BadRequestException('At least one slot is required');

    const scopedBranchId = this.getScopedBranchId();
    const branchId = input.branchId?.trim();
    const effectiveBranchId = scopedBranchId ?? branchId;
    if (scopedBranchId && branchId && branchId !== scopedBranchId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (!effectiveBranchId) throw new BadRequestException('branchId is required');

    await this.hospitalBranchService.findOne(effectiveBranchId);

    const user = this.usersService.createDoctorUser({ name, email, password: input.password });

    const entity = this.doctorRepository.create({
      id: user.id,
      userId: user.id,
      name,
      specialization,
      branchId: effectiveBranchId,
      department: input.department?.trim() || specialization,
      qualification: input.qualification?.trim() || '',
      experience: Number(input.experience) || 0,
      age: Number(input.age) || 0,
      gender: input.gender?.trim() || '',
      email: user.email,
      phone: input.phone?.trim() || '',
      licenseNo: input.licenseNo?.trim() || '',
      bio: input.bio?.trim() || '',
      slots,
      consultationFee: Number(input.consultationFee) || 0,
      percentageCut: Number(input.percentageCut) || 0,
    });

    const saved = await this.doctorRepository.save(entity);
    return toDoctor(saved);
  }

  async updateDoctor(userId: string, input: UpdateDoctorInput): Promise<Doctor> {
    const row = await this.doctorRepository.findOne({ where: { userId } });
    if (!row) throw new NotFoundException('Doctor not found');
    this.ensureBranchAccess(row.branchId ?? DEFAULT_BRANCH_ID);

    const nextName = input.name?.trim();
    const nextEmail = input.email?.trim();
    if (nextName || nextEmail) {
      const user = this.usersService.updateDoctorUser(userId, { name: nextName, email: nextEmail });
      row.name = user.name;
      row.email = user.email;
    }

    if (input.specialization?.trim()) row.specialization = input.specialization.trim();
    if (input.department !== undefined)   row.department   = input.department.trim();
    if (input.qualification !== undefined) row.qualification = input.qualification.trim();
    if (input.experience !== undefined)   row.experience   = Number(input.experience) || 0;
    if (input.age !== undefined)          row.age          = Number(input.age) || 0;
    if (input.gender !== undefined)       row.gender       = input.gender.trim();
    if (input.phone !== undefined)        row.phone        = input.phone.trim();
    if (input.licenseNo !== undefined)    row.licenseNo    = input.licenseNo.trim();
    if (input.bio !== undefined)          row.bio          = input.bio.trim();
    if (input.consultationFee !== undefined) row.consultationFee = Number(input.consultationFee) || 0;
    if (input.percentageCut !== undefined)   row.percentageCut   = Number(input.percentageCut) || 0;

    if (input.branchId !== undefined) {
      const branchId = input.branchId.trim();
      if (!branchId) throw new BadRequestException('branchId is required');
      this.ensureBranchAccess(branchId);
      await this.hospitalBranchService.findOne(branchId);
      row.branchId = branchId;
    }

    if (input.slots !== undefined) {
      const slots = this.normalizeSlots(input.slots);
      if (slots.length === 0) throw new BadRequestException('At least one slot is required');
      row.slots = slots;
    }

    const saved = await this.doctorRepository.save(row);
    return toDoctor(saved);
  }

  async removeDoctor(userId: string): Promise<void> {
    const row = await this.doctorRepository.findOne({ where: { userId, isActive: true } });
    if (!row) throw new NotFoundException('Doctor not found');
    this.ensureBranchAccess(row.branchId ?? DEFAULT_BRANCH_ID);
    row.isActive = false;
    await this.doctorRepository.save(row);
  }

  // ─── Slot Blocks ─────────────────────────────────────────────────────────────

  getSlotBlocks(doctorId: string, date?: string): SlotBlock[] {
    // Validate doctor exists — async getDoctorById not used here to keep sync
    return this.slotBlocks.filter(
      (b) => b.doctorId === doctorId && (date ? b.date === date : true),
    );
  }

  async blockSlot(doctorId: string, input: CreateSlotBlockInput): Promise<SlotBlock> {
    const doctor = await this.getDoctorById(doctorId);

    const date = input.date?.trim();
    const slot = input.slot?.trim();
    if (!date || !slot) throw new BadRequestException('date and slot are required');

    if (!doctor.slots.includes(slot)) {
      throw new BadRequestException(
        `Slot "${slot}" is not a valid slot for this doctor. Valid slots: ${doctor.slots.join(', ')}`,
      );
    }

    if (this.isDateUnavailable(doctorId, date)) {
      throw new BadRequestException(
        `The entire date ${date} is already marked unavailable. Remove it first if you want per-slot control.`,
      );
    }

    const alreadyBlocked = this.slotBlocks.some(
      (b) => b.doctorId === doctorId && b.date === date && b.slot === slot,
    );
    if (alreadyBlocked) {
      throw new BadRequestException(`Slot "${slot}" on ${date} is already blocked for this doctor`);
    }

    const block: SlotBlock = {
      id: `SB${Date.now()}`,
      doctorId,
      date,
      slot,
      reason: input.reason?.trim() || undefined,
    };

    this.slotBlocks.push(block);
    this.persistSlotBlocks();
    return block;
  }

  unblockSlot(doctorId: string, blockId: string): SlotBlock {
    const idx = this.slotBlocks.findIndex((b) => b.id === blockId && b.doctorId === doctorId);
    if (idx === -1) throw new NotFoundException('Slot block not found');
    const [removed] = this.slotBlocks.splice(idx, 1);
    this.persistSlotBlocks();
    return removed;
  }

  getBlockedSlotTimesForDate(doctorId: string, date: string): Set<string> {
    return new Set(
      this.slotBlocks
        .filter((b) => b.doctorId === doctorId && b.date === date)
        .map((b) => b.slot),
    );
  }

  // ─── Unavailable Dates ───────────────────────────────────────────────────────

  async getUnavailableDates(doctorId: string): Promise<UnavailableDate[]> {
    await this.getDoctorById(doctorId);
    return this.unavailableDates.filter((u) => u.doctorId === doctorId);
  }

  async markDateUnavailable(doctorId: string, date: string): Promise<UnavailableDate> {
    await this.getDoctorById(doctorId);
    const cleanDate = date?.trim();
    if (!cleanDate) throw new BadRequestException('date is required');
    if (this.isDateUnavailable(doctorId, cleanDate)) {
      throw new BadRequestException(`Date ${cleanDate} is already marked as unavailable`);
    }
    const entry: UnavailableDate = { id: `UD${Date.now()}`, doctorId, date: cleanDate };
    this.unavailableDates.push(entry);
    this.persistUnavailableDates();
    return entry;
  }

  async removeUnavailableDate(doctorId: string, unavailId: string): Promise<UnavailableDate> {
    await this.getDoctorById(doctorId);
    const idx = this.unavailableDates.findIndex((u) => u.id === unavailId && u.doctorId === doctorId);
    if (idx === -1) throw new NotFoundException('Unavailable date entry not found');
    const [removed] = this.unavailableDates.splice(idx, 1);
    this.persistUnavailableDates();
    return removed;
  }

  isDateUnavailable(doctorId: string, date: string): boolean {
    return this.unavailableDates.some((u) => u.doctorId === doctorId && u.date === date);
  }

  // ─── Weekly Availability Overview ────────────────────────────────────────────

  async getWeeklyAvailability(
    doctorId: string,
    weekStart?: string,
  ): Promise<Array<{
    date: string;
    dayName: string;
    totalSlots: number;
    blockedSlots: number;
    availableSlots: number;
    isUnavailable: boolean;
  }>> {
    const doctor = await this.getDoctorById(doctorId);
    const totalSlots = doctor.slots.length;

    const startDate = weekStart?.trim()
      ? new Date(`${weekStart.trim()}T00:00:00`)
      : this.getWeekMonday(new Date());

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return dayNames.map((dayName, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const unavailable = this.isDateUnavailable(doctorId, dateStr);
      const blocked = unavailable
        ? totalSlots
        : this.getBlockedSlotTimesForDate(doctorId, dateStr).size;

      return {
        date: dateStr,
        dayName,
        totalSlots,
        blockedSlots: blocked,
        availableSlots: unavailable ? 0 : totalSlots - blocked,
        isUnavailable: unavailable,
      };
    });
  }

  // ─── Persistence helpers ─────────────────────────────────────────────────────

  private loadSlotBlocks() {
    try {
      if (!existsSync(SLOT_BLOCKS_FILE)) return;
      const data = JSON.parse(readFileSync(SLOT_BLOCKS_FILE, 'utf8'));
      if (Array.isArray(data)) this.slotBlocks = data;
    } catch (_) {}
  }

  private persistSlotBlocks() {
    mkdirSync(dirname(SLOT_BLOCKS_FILE), { recursive: true });
    writeFileSync(SLOT_BLOCKS_FILE, JSON.stringify(this.slotBlocks, null, 2));
  }

  private loadUnavailableDates() {
    try {
      if (!existsSync(UNAVAILABLE_DATES_FILE)) return;
      const data = JSON.parse(readFileSync(UNAVAILABLE_DATES_FILE, 'utf8'));
      if (Array.isArray(data)) this.unavailableDates = data;
    } catch (_) {}
  }

  private persistUnavailableDates() {
    mkdirSync(dirname(UNAVAILABLE_DATES_FILE), { recursive: true });
    writeFileSync(UNAVAILABLE_DATES_FILE, JSON.stringify(this.unavailableDates, null, 2));
  }

  private getWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private normalizeSlots(slots?: string[]): string[] {
    if (!Array.isArray(slots)) return [];
    return [...new Set(slots.map((slot) => slot?.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }
}
