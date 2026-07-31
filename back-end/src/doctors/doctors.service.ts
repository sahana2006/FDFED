import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { UsersService } from '../users/users.service';

export type Doctor = {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  department: string;
  qualification: string;
  experience: number; // years
  age: number;
  gender: string;
  email: string;
  phone: string;
  licenseNo: string;
  bio: string;
  slots: string[];
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
  slots: string[];
  department?: string;
  qualification?: string;
  experience?: number;
  age?: number;
  gender?: string;
  phone?: string;
  licenseNo?: string;
  bio?: string;
};

export type UpdateDoctorInput = Partial<Omit<CreateDoctorInput, 'password'>>;

const SLOT_BLOCKS_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'slot-blocks.json',
);

const UNAVAILABLE_DATES_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'unavailable-dates.json',
);

@Injectable()
export class DoctorsService {
  private readonly doctors: Doctor[] = [
    {
      id: 'DOC001',
      userId: 'DOC001',
      name: 'Dr. S Madhuri',
      specialization: 'Dermatologist',
      department: 'Dermatology',
      qualification: 'MBBS, MD - Dermatology',
      experience: 12,
      age: 38,
      gender: 'Female',
      email: 'madhuri@medbits.com',
      phone: '9876541001',
      licenseNo: 'MCI-DRM-2012-001',
      bio: 'Specialist in skin disorders, cosmetic dermatology and laser treatments with 12 years of clinical experience.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC002',
      userId: 'DOC002',
      name: 'Dr. Ashwini Ray',
      specialization: 'Dermatologist',
      department: 'Dermatology',
      qualification: 'MBBS, DNB - Dermatology',
      experience: 8,
      age: 34,
      gender: 'Female',
      email: 'ashwini.ray@medbits.com',
      phone: '9876541002',
      licenseNo: 'MCI-DRM-2016-002',
      bio: 'Focused on pediatric dermatology, eczema management and phototherapy.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC003',
      userId: 'DOC003',
      name: 'Dr. Sarah Johnson',
      specialization: 'Cardiologist',
      department: 'Cardiology',
      qualification: 'MBBS, MD, DM - Cardiology',
      experience: 15,
      age: 44,
      gender: 'Female',
      email: 'sarah.johnson@medbits.com',
      phone: '9384751206',
      licenseNo: 'MCI-CAR-2009-003',
      bio: 'Interventional cardiologist specializing in angioplasty, heart failure management and preventive cardiology.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC004',
      userId: 'DOC004',
      name: 'Dr. Ramesh Iyer',
      specialization: 'Cardiologist',
      department: 'Cardiology',
      qualification: 'MBBS, MD, DM - Cardiology',
      experience: 20,
      age: 50,
      gender: 'Male',
      email: 'ramesh.iyer@medbits.com',
      phone: '9876541004',
      licenseNo: 'MCI-CAR-2004-004',
      bio: 'Senior cardiologist with expertise in echocardiography, cardiac arrhythmias and valve disorders.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC005',
      userId: 'DOC005',
      name: 'Dr. Paul Johnson',
      specialization: 'Pediatrician',
      department: 'Paediatrics',
      qualification: 'MBBS, MD - Paediatrics',
      experience: 10,
      age: 39,
      gender: 'Male',
      email: 'paul.johnson@medbits.com',
      phone: '9876541005',
      licenseNo: 'MCI-PED-2014-005',
      bio: 'Dedicated to child health and development, neonatal care, and adolescent medicine.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC006',
      userId: 'DOC006',
      name: 'Dr. Robert Wilson',
      specialization: 'Orthopedic',
      department: 'Orthopaedics',
      qualification: 'MBBS, MS - Orthopaedics',
      experience: 18,
      age: 47,
      gender: 'Male',
      email: 'robert.wilson@medbits.com',
      phone: '9876541006',
      licenseNo: 'MCI-ORT-2006-006',
      bio: 'Expert in joint replacement, sports injuries, spine surgery and trauma management.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC007',
      userId: 'DOC007',
      name: 'Dr. Anita Gupta',
      specialization: 'Neurologist',
      department: 'Neurology',
      qualification: 'MBBS, MD, DM - Neurology',
      experience: 14,
      age: 43,
      gender: 'Female',
      email: 'anita.gupta@medbits.com',
      phone: '9876541007',
      licenseNo: 'MCI-NEU-2010-007',
      bio: 'Specialist in epilepsy, migraine, stroke management and neurodegenerative disorders.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC008',
      userId: 'DOC008',
      name: 'Dr. Kavita Sharma',
      specialization: 'General',
      department: 'General Medicine',
      qualification: 'MBBS, MD - General Medicine',
      experience: 9,
      age: 36,
      gender: 'Female',
      email: 'kavita.sharma@medbits.com',
      phone: '9876541008',
      licenseNo: 'MCI-GEN-2015-008',
      bio: 'Primary care physician with focus on preventive medicine, chronic disease management and patient wellness.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
    {
      id: 'DOC009',
      userId: 'DOC009',
      name: 'Dr. Vikram Nair',
      specialization: 'General',
      department: 'General Medicine',
      qualification: 'MBBS, MD - General Medicine',
      experience: 11,
      age: 40,
      gender: 'Male',
      email: 'vikram.nair@medbits.com',
      phone: '9876541009',
      licenseNo: 'MCI-GEN-2013-009',
      bio: 'Experienced general physician managing acute and chronic conditions with emphasis on holistic patient care.',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00'],
    },
  ];

  // ─── In-memory slot management stores ───────────────────────────────────────

  private slotBlocks: SlotBlock[] = [];
  private unavailableDates: UnavailableDate[] = [];

  constructor(private readonly usersService: UsersService) {
    this.loadSlotBlocks();
    this.loadUnavailableDates();
  }

  // ─── Doctor lookup ───────────────────────────────────────────────────────────

  findAll(specialization?: string): Doctor[] {
    const normalizedSpecialization = specialization?.trim();
    const doctors = normalizedSpecialization
      ? this.doctors.filter(
          (doctor) => doctor.specialization === normalizedSpecialization,
        )
      : this.doctors;

    return doctors.map((doctor) => ({ ...doctor, slots: [...doctor.slots] }));
  }

  getDoctorById(doctorId: string): Doctor {
    const doctor = this.doctors.find(
      (item) => item.id === doctorId || item.userId === doctorId,
    );
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return { ...doctor, slots: [...doctor.slots] };
  }

  createDoctor(input: CreateDoctorInput): Doctor {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const specialization = input.specialization?.trim();
    const slots = this.normalizeSlots(input.slots);

    if (!name || !email || !input.password || !specialization) {
      throw new BadRequestException(
        'name, email, password and specialization are required',
      );
    }

    if (slots.length === 0) {
      throw new BadRequestException('At least one slot is required');
    }

    const user = this.usersService.createDoctorUser({
      name,
      email,
      password: input.password,
    });

    const doctor: Doctor = {
      id: user.id,
      userId: user.id,
      name,
      specialization,
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
    };

    this.doctors.push(doctor);
    return { ...doctor, slots: [...doctor.slots] };
  }

  updateDoctor(userId: string, input: UpdateDoctorInput): Doctor {
    const doctor = this.doctors.find((item) => item.userId === userId);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const nextName = input.name?.trim();
    const nextEmail = input.email?.trim();
    if (nextName || nextEmail) {
      const user = this.usersService.updateDoctorUser(userId, {
        name: nextName,
        email: nextEmail,
      });
      doctor.name = user.name;
      doctor.email = user.email;
    }

    if (input.specialization?.trim()) {
      doctor.specialization = input.specialization.trim();
    }
    if (input.department !== undefined) {
      doctor.department = input.department.trim();
    }
    if (input.qualification !== undefined) {
      doctor.qualification = input.qualification.trim();
    }
    if (input.experience !== undefined) {
      doctor.experience = Number(input.experience) || 0;
    }
    if (input.age !== undefined) {
      doctor.age = Number(input.age) || 0;
    }
    if (input.gender !== undefined) {
      doctor.gender = input.gender.trim();
    }
    if (input.phone !== undefined) {
      doctor.phone = input.phone.trim();
    }
    if (input.licenseNo !== undefined) {
      doctor.licenseNo = input.licenseNo.trim();
    }
    if (input.bio !== undefined) {
      doctor.bio = input.bio.trim();
    }
    if (input.slots !== undefined) {
      const slots = this.normalizeSlots(input.slots);
      if (slots.length === 0) {
        throw new BadRequestException('At least one slot is required');
      }
      doctor.slots = slots;
    }

    return { ...doctor, slots: [...doctor.slots] };
  }

  // ─── Slot Blocks ─────────────────────────────────────────────────────────────

  /**
   * Returns all blocked slots for a doctor, optionally filtered by date.
   * @param doctorId The doctor's ID
   * @param date     Optional ISO date (YYYY-MM-DD) to filter results
   */
  getSlotBlocks(doctorId: string, date?: string): SlotBlock[] {
    this.getDoctorById(doctorId); // validate doctor exists
    return this.slotBlocks.filter(
      (b) => b.doctorId === doctorId && (date ? b.date === date : true),
    );
  }

  /**
   * Blocks a specific time slot on a specific date for a doctor.
   * @throws BadRequestException if the slot is already blocked, invalid, or date is unavailable
   */
  blockSlot(doctorId: string, input: CreateSlotBlockInput): SlotBlock {
    const doctor = this.getDoctorById(doctorId);

    const date = input.date?.trim();
    const slot = input.slot?.trim();
    if (!date || !slot) {
      throw new BadRequestException('date and slot are required');
    }

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
      throw new BadRequestException(
        `Slot "${slot}" on ${date} is already blocked for this doctor`,
      );
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

  /**
   * Removes a previously blocked slot.
   * @throws NotFoundException if the block record does not exist
   */
  unblockSlot(doctorId: string, blockId: string): SlotBlock {
    this.getDoctorById(doctorId);
    const idx = this.slotBlocks.findIndex(
      (b) => b.id === blockId && b.doctorId === doctorId,
    );
    if (idx === -1) {
      throw new NotFoundException('Slot block not found');
    }

    const [removed] = this.slotBlocks.splice(idx, 1);
    this.persistSlotBlocks();
    return removed;
  }

  /**
   * Returns the set of blocked slot times for a doctor on a given date.
   * Used internally by AppointmentsService.
   */
  getBlockedSlotTimesForDate(doctorId: string, date: string): Set<string> {
    return new Set(
      this.slotBlocks
        .filter((b) => b.doctorId === doctorId && b.date === date)
        .map((b) => b.slot),
    );
  }

  // ─── Unavailable Dates ───────────────────────────────────────────────────────

  /**
   * Returns all dates marked fully unavailable for a doctor.
   */
  getUnavailableDates(doctorId: string): UnavailableDate[] {
    this.getDoctorById(doctorId);
    return this.unavailableDates.filter((u) => u.doctorId === doctorId);
  }

  /**
   * Marks an entire date as unavailable for a doctor.
   * @throws BadRequestException if the date is already marked
   */
  markDateUnavailable(doctorId: string, date: string): UnavailableDate {
    this.getDoctorById(doctorId);

    const cleanDate = date?.trim();
    if (!cleanDate) {
      throw new BadRequestException('date is required');
    }

    if (this.isDateUnavailable(doctorId, cleanDate)) {
      throw new BadRequestException(`Date ${cleanDate} is already marked as unavailable`);
    }

    const entry: UnavailableDate = {
      id: `UD${Date.now()}`,
      doctorId,
      date: cleanDate,
    };

    this.unavailableDates.push(entry);
    this.persistUnavailableDates();
    return entry;
  }

  /**
   * Removes a date from the unavailable list.
   * @throws NotFoundException if the entry does not exist
   */
  removeUnavailableDate(doctorId: string, unavailId: string): UnavailableDate {
    this.getDoctorById(doctorId);
    const idx = this.unavailableDates.findIndex(
      (u) => u.id === unavailId && u.doctorId === doctorId,
    );
    if (idx === -1) {
      throw new NotFoundException('Unavailable date entry not found');
    }

    const [removed] = this.unavailableDates.splice(idx, 1);
    this.persistUnavailableDates();
    return removed;
  }

  /**
   * Returns true if the given date is fully blocked for a doctor.
   * Used internally by AppointmentsService.
   */
  isDateUnavailable(doctorId: string, date: string): boolean {
    return this.unavailableDates.some(
      (u) => u.doctorId === doctorId && u.date === date,
    );
  }

  // ─── Weekly Availability Overview ────────────────────────────────────────────

  /**
   * Returns availability summary for each day of the week starting from weekStart.
   * @param doctorId  The doctor's ID
   * @param weekStart ISO date (YYYY-MM-DD) for Monday of the target week (defaults to current week)
   */
  getWeeklyAvailability(
    doctorId: string,
    weekStart?: string,
  ): Array<{
    date: string;
    dayName: string;
    totalSlots: number;
    blockedSlots: number;
    availableSlots: number;
    isUnavailable: boolean;
  }> {
    const doctor = this.getDoctorById(doctorId);
    const totalSlots = doctor.slots.length;

    // Compute the Monday of the current ISO week if not provided
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
    writeFileSync(
      UNAVAILABLE_DATES_FILE,
      JSON.stringify(this.unavailableDates, null, 2),
    );
  }

  private getWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private normalizeSlots(slots?: string[]): string[] {
    if (!Array.isArray(slots)) {
      return [];
    }

    return [...new Set(slots.map((slot) => slot?.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }
}
