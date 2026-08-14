import { BadRequestException, ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { BranchAdminEntity } from './entities/branch-admin.entity';
import { DoctorEntity } from '../doctors/entities/doctor.entity';
import { FrontdeskEntity } from '../frontdesk/entities/frontdesk.entity';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export enum Role {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  /** @deprecated Branch administrators now use BRANCH_ADMIN. */
  ADMIN = 'admin',
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  FRONTDESK = 'frontdesk',
  LABTECH = 'labtech',
}

// Keep string literals supported for existing @Roles(...) calls and user data.
export type UserRole = `${Role}`;

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId?: string;
  phone?: string;
};

type SafeUser = Omit<User, 'password'> & {
  firstName?: string;
  lastName?: string;
};

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  branchId: string;
  guardianName: string;
  password: string;
};

export type CreateDoctorUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateDoctorUserInput = {
  name?: string;
  email?: string;
};

export type CreateFrontdeskUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateFrontdeskUserInput = {
  name?: string;
  email?: string;
};

export type CreateBranchAdminUserInput = {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone: string;
};

const scrypt = promisify(scryptCallback);
const DEFAULT_SUPER_ADMIN_EMAIL = 'superadmin@medbits.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';
const DEFAULT_BRANCH_ADMIN_EMAIL = 'admin@medbits.com';
const DEFAULT_BRANCH_ADMIN_NAME = 'Admin User';
const DEFAULT_BRANCH_ADMIN_PASSWORD = 'admin123';
const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly patientsService: PatientsService,
    @InjectRepository(LabTechnician)
    private readonly labTechnicianRepository: Repository<LabTechnician>,
    @InjectRepository(BranchAdminEntity)
    private readonly branchAdminRepository: Repository<BranchAdminEntity>,
    @InjectRepository(DoctorEntity)
    private readonly doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(FrontdeskEntity)
    private readonly frontdeskRepository: Repository<FrontdeskEntity>,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  private readonly users: User[] = [
    { id: 'ADM001', name: 'Admin User', email: 'admin@medbits.com', password: 'admin123', role: Role.BRANCH_ADMIN, branchId: DEFAULT_BRANCH_ID, phone: '' },
    { id: 'PAT001', name: 'Ria Sharma', email: 'ria@medbits.com', password: 'patient123', role: 'patient' },
    { id: 'PAT002', name: 'Arun Menon', email: 'arun.menon@medbits.com', password: 'patient123', role: 'patient' },
    { id: 'PAT003', name: 'Farah Ali', email: 'farah.ali@medbits.com', password: 'patient123', role: 'patient' },
    { id: 'PAT004', name: 'Dev Patel', email: 'dev.patel@medbits.com', password: 'patient123', role: 'patient' },
    { id: 'DOC001', name: 'Dr. S Madhuri', email: 'madhuri@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC002', name: 'Dr. Ashwini Ray', email: 'ashwini.ray@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC003', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC004', name: 'Dr. Ramesh Iyer', email: 'ramesh.iyer@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC005', name: 'Dr. Paul Johnson', email: 'paul.johnson@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC006', name: 'Dr. Robert Wilson', email: 'robert.wilson@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC007', name: 'Dr. Anita Gupta', email: 'anita.gupta@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC008', name: 'Dr. Kavita Sharma', email: 'kavita.sharma@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'DOC009', name: 'Dr. Vikram Nair', email: 'vikram.nair@medbits.com', password: 'doctor123', role: 'doctor' },
    { id: 'FD001', name: 'Priya Nair', email: 'frontdesk@medbits.com', password: 'desk123', role: 'frontdesk' },
  ];

  async onModuleInit(): Promise<void> {
    await this.seedDefaultBranchAdmin();
    await this.hydrateBranchAdmins();
    await this.hydrateDoctorAndFrontdeskUsers();

    const email = (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL)
      .trim()
      .toLowerCase();
    if (this.users.some((user) => user.email.toLowerCase() === email)) return;

    const password = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;
    this.users.push({
      id: 'SADM001',
      name: 'Super Admin',
      email,
      password: await this.hashPassword(password),
      role: Role.SUPER_ADMIN,
    });
  }

  /**
   * Loads all doctor and frontdesk users from the SQLite database into the
   * in-memory users[] array so that login works correctly after a restart.
   * Existing hardcoded entries (DOC001–DOC009, FD001) are replaced/merged.
   */
  private async hydrateDoctorAndFrontdeskUsers(): Promise<void> {
    const doctors = await this.doctorRepository.find();
    for (const doc of doctors) {
      const existing = this.users.findIndex(
        (u) => u.id === doc.id || u.email.toLowerCase() === doc.email.toLowerCase(),
      );
      const user: User = {
        id: doc.userId,
        name: doc.name,
        email: doc.email,
        // Keep existing password if already in memory (plain text seeds), else default
        password: existing >= 0 ? this.users[existing].password : 'doctor123',
        role: Role.DOCTOR,
      };
      if (existing >= 0) this.users[existing] = user;
      else this.users.push(user);
    }

    const frontdesks = await this.frontdeskRepository.find();
    for (const fd of frontdesks) {
      const existing = this.users.findIndex(
        (u) => u.id === fd.userId || u.email.toLowerCase() === fd.email.toLowerCase(),
      );
      const user: User = {
        id: fd.userId,
        name: fd.name,
        email: fd.email,
        password: existing >= 0 ? this.users[existing].password : 'desk123',
        role: Role.FRONTDESK,
      };
      if (existing >= 0) this.users[existing] = user;
      else this.users.push(user);
    }
  }

  private async seedDefaultBranchAdmin(): Promise<void> {
    const userId = 'ADM001';
    const existingAssignment = await this.branchAdminRepository.findOne({ where: { branchId: DEFAULT_BRANCH_ID } });
    if (existingAssignment) {
      if (existingAssignment.userId === userId && !existingAssignment.password) {
        existingAssignment.password = await this.hashPassword(DEFAULT_BRANCH_ADMIN_PASSWORD);
        await this.branchAdminRepository.save(existingAssignment);
      }
      return;
    }

    const branch = await this.hospitalBranchService.findOne(DEFAULT_BRANCH_ID);
    await this.branchAdminRepository.save(
      this.branchAdminRepository.create({
        userId,
        branchId: branch.id,
        name: DEFAULT_BRANCH_ADMIN_NAME,
        email: DEFAULT_BRANCH_ADMIN_EMAIL,
        password: await this.hashPassword(DEFAULT_BRANCH_ADMIN_PASSWORD),
        phone: '',
        branch,
      }),
    );
  }

  private async hydrateBranchAdmins(): Promise<void> {
    const assignments = await this.branchAdminRepository.find();
    for (const assignment of assignments) {
      const user: User = {
        id: assignment.userId,
        name: assignment.name,
        email: assignment.email,
        password: assignment.password ?? '',
        role: Role.BRANCH_ADMIN,
        branchId: assignment.branchId,
        phone: assignment.phone,
      };

      const existingIndex = this.users.findIndex((item) => item.id === assignment.userId || item.email.toLowerCase() === assignment.email.toLowerCase());
      if (existingIndex >= 0) {
        this.users[existingIndex] = user;
      } else {
        this.users.push(user);
      }
    }
  }

  async getBranchAdminBranchId(userId: string): Promise<string | null> {
    const assignment = await this.branchAdminRepository.findOne({ where: { userId } });
    if (assignment?.branchId) {
      return assignment.branchId;
    }

    const inMemoryUser = this.users.find(
      (user) => user.id === userId && user.role === Role.BRANCH_ADMIN,
    );
    return inMemoryUser?.branchId ?? null;
  }

  async getBranchAdminByBranchId(branchId: string): Promise<{
    userId: string;
    name: string;
    email: string;
    phone: string;
    branchId: string;
    branchName: string;
    status: string;
  } | null> {
    const assignment = await this.branchAdminRepository.findOne({ where: { branchId }, relations: { branch: true } });
    if (!assignment) {
      return null;
    }

    return {
      userId: assignment.userId,
      name: assignment.name,
      email: assignment.email,
      phone: assignment.phone,
      branchId: assignment.branchId,
      branchName: assignment.branch.branchName,
      status: assignment.branch.status,
    };
  }

  async listBranchAdminSummaries(): Promise<Array<{
    userId: string;
    name: string;
    email: string;
    phone: string;
    branchId: string;
    branchName: string;
    branchStatus: string;
    createdAt: Date;
  }>> {
    const assignments = await this.branchAdminRepository.find({ relations: { branch: true }, order: { createdAt: 'DESC' } });
    return assignments.map((assignment) => ({
      userId: assignment.userId,
      name: assignment.name,
      email: assignment.email,
      phone: assignment.phone,
      branchId: assignment.branchId,
      branchName: assignment.branch.branchName,
      branchStatus: assignment.branch.status,
      createdAt: assignment.createdAt,
    }));
  }

  async login(email: string, password: string): Promise<SafeUser | null> {
    const user = this.users.find((item) => item.email === email);
    if (!user) {
      const technician = await this.labTechnicianRepository.findOneBy({ email: email.trim().toLowerCase() });
      if (!technician || technician.password !== password) return null;
      return { id: technician.id, name: technician.name, email: technician.email, role: 'labtech' };
    }
    const passwordMatches = user.password.startsWith('scrypt$')
      ? await this.verifyPassword(password, user.password)
      : user.password === password;
    if (!passwordMatches) return null;

    const { password: _password, ...safeUser } = user;
    if (safeUser.role !== 'patient') return safeUser;

    const patientProfile = this.patientsService.getPatientByUserId(safeUser.id);
    return { ...safeUser, firstName: patientProfile.firstName, lastName: patientProfile.lastName };
  }

  async signupPatient(input: SignupInput): Promise<SafeUser> {
    const email = input.email.trim().toLowerCase();
    if (this.users.some((item) => item.email.toLowerCase() === email)) {
      throw new BadRequestException('Email is already registered');
    }

    const nextId = this.generateNextPatientId();
    const safeName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    const user: User = { id: nextId, name: safeName, email, password: input.password, role: 'patient' };

    this.users.push(user);
    await this.patientsService.createPatientProfile({
      userId: nextId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      dob: input.dob.trim(),
      gender: input.gender.trim(),
      bloodGroup: input.bloodGroup.trim(),
      phone: input.phone.trim(),
      email,
      guardianName: input.guardianName.trim(),
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role, firstName: input.firstName.trim(), lastName: input.lastName.trim() };
  }

  createDoctorUser(input: CreateDoctorUserInput): SafeUser {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!name || !email || !input.password) throw new BadRequestException('Name, email and password are required');
    if (this.users.some((item) => item.email.toLowerCase() === email)) throw new BadRequestException('Email is already registered');

    const user: User = { id: this.generateNextDoctorId(), name, email, password: input.password, role: 'doctor' };
    this.users.push(user);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  updateDoctorUser(userId: string, input: UpdateDoctorUserInput): SafeUser {
    const user = this.users.find((item) => item.id === userId && item.role === 'doctor');
    if (!user) throw new BadRequestException('Doctor user not found');

    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email.toLowerCase()) {
      if (this.users.some((item) => item.email.toLowerCase() === email)) throw new BadRequestException('Email is already registered');
      user.email = email;
    }

    const name = input.name?.trim();
    if (name) user.name = name;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  createFrontdeskUser(input: CreateFrontdeskUserInput): SafeUser {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!name || !email || !input.password) throw new BadRequestException('Name, email and password are required');
    if (this.users.some((item) => item.email.toLowerCase() === email)) throw new BadRequestException('Email is already registered');

    const user: User = { id: this.generateNextFrontdeskId(), name, email, password: input.password, role: 'frontdesk' };
    this.users.push(user);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  updateFrontdeskUser(userId: string, input: UpdateFrontdeskUserInput): SafeUser {
    const user = this.users.find((item) => item.id === userId && item.role === 'frontdesk');
    if (!user) throw new BadRequestException('Frontdesk user not found');

    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email.toLowerCase()) {
      if (this.users.some((item) => item.email.toLowerCase() === email)) throw new BadRequestException('Email is already registered');
      user.email = email;
    }

    const name = input.name?.trim();
    if (name) user.name = name;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async createBranchAdminUser(input: CreateBranchAdminUserInput): Promise<SafeUser> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const branchId = input.branchId.trim();
    if (!name || !email || !phone || !input.password || !branchId) {
      throw new BadRequestException('name, email, phone, password and branchId are required');
    }
    if (this.users.some((user) => user.email.toLowerCase() === email)) {
      throw new ConflictException('Email is already registered');
    }

    const existingBranchAdmin = await this.branchAdminRepository.findOne({ where: { branchId } });
    if (existingBranchAdmin) {
      throw new ConflictException('This branch already has an active Branch Admin');
    }

    const branch = await this.hospitalBranchService.findOne(branchId);
    const user: User = {
      id: this.generateNextBranchAdminId(),
      name,
      email,
      phone,
      password: await this.hashPassword(input.password),
      role: Role.BRANCH_ADMIN,
      branchId,
    };

    await this.branchAdminRepository.save(
      this.branchAdminRepository.create({ userId: user.id, branchId, name, email, password: user.password, phone, branch }),
    );
    this.users.push(user);
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private generateNextPatientId(): string {
    const patientIds = this.users
      .filter((item) => item.role === 'patient')
      .map((item) => Number.parseInt(item.id.replace('PAT', ''), 10))
      .filter((value) => Number.isFinite(value));
    const nextNumber = (patientIds.length ? Math.max(...patientIds) : 0) + 1;
    return `PAT${nextNumber.toString().padStart(3, '0')}`;
  }

  private generateNextDoctorId(): string {
    const doctorIds = this.users
      .filter((item) => item.role === 'doctor')
      .map((item) => Number.parseInt(item.id.replace('DOC', ''), 10))
      .filter((value) => Number.isFinite(value));
    const nextNumber = (doctorIds.length ? Math.max(...doctorIds) : 0) + 1;
    return `DOC${nextNumber.toString().padStart(3, '0')}`;
  }

  private generateNextFrontdeskId(): string {
    const frontdeskIds = this.users
      .filter((item) => item.role === 'frontdesk')
      .map((item) => Number.parseInt(item.id.replace('FD', ''), 10))
      .filter((value) => Number.isFinite(value));
    const nextNumber = (frontdeskIds.length ? Math.max(...frontdeskIds) : 0) + 1;
    return `FD${nextNumber.toString().padStart(3, '0')}`;
  }

  private generateNextBranchAdminId(): string {
    const branchAdminIds = this.users
      .filter((user) => user.role === Role.BRANCH_ADMIN)
      .map((user) => Number.parseInt(user.id.replace('BAD', ''), 10))
      .filter((value) => Number.isFinite(value));
    const nextNumber = (branchAdminIds.length ? Math.max(...branchAdminIds) : 0) + 1;
    return `BAD${nextNumber.toString().padStart(3, '0')}`;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64) as Buffer;
    return `scrypt$${salt}$${hash.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;

    const derivedHash = await scrypt(password, salt, 64) as Buffer;
    const storedHashBuffer = Buffer.from(hash, 'hex');
    return storedHashBuffer.length === derivedHash.length
      && timingSafeEqual(storedHashBuffer, derivedHash);
  }
}



