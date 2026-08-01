import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

export type PatientProfile = {
  userId: string;
  branchId: string;
  branch?: HospitalBranch;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;
  guardianName: string;
};

export type CreatePatientProfileInput = Omit<PatientProfile, 'userId'>;
export type UpdatePatientProfileInput = Partial<Omit<PatientProfile, 'userId'>>;

@Injectable()
export class PatientsService {
  private readonly patients: PatientProfile[] = [
    { userId: 'PAT001', branchId: DEFAULT_BRANCH_ID, firstName: 'Ria', lastName: 'Sharma', dob: '1990-10-24', gender: 'Female', bloodGroup: 'A+', phone: '9473487399', email: 'ria@medbits.com', guardianName: 'Ravi Sharma' },
    { userId: 'PAT002', branchId: DEFAULT_BRANCH_ID, firstName: 'Arun', lastName: 'Menon', dob: '1988-02-28', gender: 'Male', bloodGroup: 'O+', phone: '9123456780', email: 'arun.menon@medbits.com', guardianName: 'Lakshmi Menon' },
    { userId: 'PAT003', branchId: DEFAULT_BRANCH_ID, firstName: 'Farah', lastName: 'Ali', dob: '2001-11-06', gender: 'Female', bloodGroup: 'A-', phone: '9988776655', email: 'farah.ali@medbits.com', guardianName: 'Imran Ali' },
    { userId: 'PAT004', branchId: DEFAULT_BRANCH_ID, firstName: 'Dev', lastName: 'Patel', dob: '1992-07-19', gender: 'Male', bloodGroup: 'AB+', phone: '9012345678', email: 'dev.patel@medbits.com', guardianName: 'Kiran Patel' },
  ];

  constructor(private readonly hospitalBranchService: HospitalBranchService) {}

  getPatientByUserId(userId: string): PatientProfile {
    const patient = this.patients.find((item) => item.userId === userId);
    if (!patient) throw new NotFoundException('Patient profile not found');
    return { ...patient };
  }

  getAllPatients(): PatientProfile[] {
    return this.patients.map((patient) => ({ ...patient }));
  }

  async createPatientProfile(profile: CreatePatientProfileInput): Promise<PatientProfile> {
    const branchId = profile.branchId?.trim();
    if (!branchId) throw new BadRequestException('branchId is required');

    const branch = await this.hospitalBranchService.findOne(branchId);
    const patient: PatientProfile = { ...profile, branchId, branch };
    this.patients.push({ ...patient });
    return { ...patient };
  }

  async createPatient(input: CreatePatientProfileInput): Promise<PatientProfile> {
    const branchId = input.branchId?.trim();
    const normalizedPatient: PatientProfile = {
      userId: this.generateNextPatientId(),
      branchId: branchId || '',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      dob: input.dob.trim(),
      gender: input.gender.trim(),
      bloodGroup: input.bloodGroup.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      guardianName: input.guardianName.trim(),
    };

    if (!normalizedPatient.firstName || !normalizedPatient.lastName || !normalizedPatient.dob || !normalizedPatient.gender || !normalizedPatient.bloodGroup || !normalizedPatient.phone || !normalizedPatient.email) {
      throw new BadRequestException('firstName, lastName, dob, gender, bloodGroup, phone and email are required');
    }
    if (!branchId) throw new BadRequestException('branchId is required');

    normalizedPatient.branch = await this.hospitalBranchService.findOne(branchId);
    this.patients.push(normalizedPatient);
    return { ...normalizedPatient };
  }

  async updatePatientByUserId(userId: string, updates: UpdatePatientProfileInput): Promise<PatientProfile> {
    const patientIndex = this.patients.findIndex((item) => item.userId === userId);
    if (patientIndex === -1) throw new NotFoundException('Patient profile not found');

    const nextPatient = { ...this.patients[patientIndex], ...updates, userId } as PatientProfile;
    if (updates.branchId !== undefined) {
      const branchId = updates.branchId.trim();
      if (branchId) {
        nextPatient.branchId = branchId;
        nextPatient.branch = await this.hospitalBranchService.findOne(branchId);
      }
    }

    this.patients[patientIndex] = nextPatient;
    return { ...nextPatient };
  }

  private generateNextPatientId(): string {
    const patientIds = this.patients
      .map((item) => Number.parseInt(item.userId.replace('PAT', ''), 10))
      .filter((value) => Number.isFinite(value));

    const nextNumber = (patientIds.length ? Math.max(...patientIds) : 0) + 1;
    return `PAT${nextNumber.toString().padStart(3, '0')}`;
  }
}
