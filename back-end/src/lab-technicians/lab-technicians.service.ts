import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, OnModuleInit, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { CreateLabTechnicianDto } from './dto/create-lab-technician.dto';
import { LabTechnician } from './entities/lab-technician.entity';

export type LabTechnicianRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'labtech';
  branchId: string;
  createdAt: Date;
};

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class LabTechniciansService implements OnModuleInit {
  private readonly inMemoryLabTechnicians: LabTechnicianRecord[] = [
    {
      id: 'LT001',
      name: 'Suresh Kumar',
      email: 'labtech@medbits.com',
      password: 'lab123',
      role: 'labtech',
      branchId: DEFAULT_BRANCH_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      id: 'LT002',
      name: 'Aakash Verma',
      email: 'aakash.verma@medbits.com',
      password: 'lab123',
      role: 'labtech',
      branchId: DEFAULT_BRANCH_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];

  constructor(
    @InjectRepository(LabTechnician)
    private readonly labTechnicianRepository: Repository<LabTechnician>,
    @Inject(forwardRef(() => HospitalBranchService))
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateAndSeed();
  }

  private async hydrateAndSeed(): Promise<void> {
    try {
      // 1. Ensure seed lab technicians exist in DB
      for (const defaultTech of this.inMemoryLabTechnicians) {
        const existing = await this.labTechnicianRepository.findOneBy({
          email: defaultTech.email.toLowerCase(),
        });
        if (!existing) {
          try {
            await this.labTechnicianRepository.save(
              this.labTechnicianRepository.create({
                name: defaultTech.name,
                email: defaultTech.email.toLowerCase(),
                password: defaultTech.password,
                branchId: defaultTech.branchId,
              }),
            );
          } catch (_) {}
        }
      }

      // 2. Load any DB lab technicians into in-memory store
      const dbTechs = await this.labTechnicianRepository.find();
      for (const t of dbTechs) {
        const idx = this.inMemoryLabTechnicians.findIndex(
          (m) => m.id === t.id || m.email.toLowerCase() === t.email.toLowerCase(),
        );
        const record: LabTechnicianRecord = {
          id: t.id,
          name: t.name,
          email: t.email.toLowerCase(),
          password: t.password,
          role: 'labtech',
          branchId: t.branchId,
          createdAt: t.createdAt || new Date(),
        };
        if (idx >= 0) {
          this.inMemoryLabTechnicians[idx] = record;
        } else {
          this.inMemoryLabTechnicians.push(record);
        }
      }
    } catch (_) {
      // If database is not ready, in-memory structures remain 100% active
    }
  }

  async create(input: CreateLabTechnicianDto): Promise<{
    id: string;
    name: string;
    email: string;
    role: 'labtech';
    branchId: string;
  }> {
    const branchId = input.branchId?.trim();
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    try {
      await this.hospitalBranchService.findOne(branchId);
    } catch (_) {}

    const email = input.email.trim().toLowerCase();
    const existingInMemory = this.inMemoryLabTechnicians.find(
      (t) => t.email.toLowerCase() === email,
    );
    if (existingInMemory) {
      throw new ConflictException('A lab technician with this email already exists');
    }

    let savedId = `LT${Date.now()}`;
    try {
      const technician = await this.labTechnicianRepository.save(
        this.labTechnicianRepository.create({
          name: input.name.trim(),
          email,
          password: input.password,
          branchId,
        }),
      );
      savedId = technician.id;
    } catch (_) {}

    const record: LabTechnicianRecord = {
      id: savedId,
      name: input.name.trim(),
      email,
      password: input.password,
      role: 'labtech',
      branchId,
      createdAt: new Date(),
    };
    this.inMemoryLabTechnicians.unshift(record);

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: 'labtech',
      branchId: record.branchId,
    };
  }

  async findAll(branchId?: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: 'labtech';
    branchId: string;
    createdAt: Date;
  }>> {
    let list = [...this.inMemoryLabTechnicians];
    if (branchId?.trim()) {
      list = list.filter((t) => t.branchId === branchId.trim());
    }
    return list.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: 'labtech',
      branchId: t.branchId,
      createdAt: t.createdAt,
    }));
  }

  async findByEmail(email: string): Promise<LabTechnician | LabTechnicianRecord | null> {
    const normalized = email.trim().toLowerCase();
    const found = this.inMemoryLabTechnicians.find((t) => t.email.toLowerCase() === normalized);
    if (found) return found as any;
    try {
      return await this.labTechnicianRepository.findOneBy({ email: normalized });
    } catch (_) {
      return null;
    }
  }

  async findOne(id: string): Promise<LabTechnician | LabTechnicianRecord> {
    const found = this.inMemoryLabTechnicians.find((t) => t.id === id);
    if (found) return found as any;
    try {
      const technician = await this.labTechnicianRepository.findOneBy({ id });
      if (technician) return technician;
    } catch (_) {}
    throw new NotFoundException('Lab technician not found');
  }

  async update(id: string, input: any): Promise<{ id: string; name: string; email: string; role: 'labtech'; branchId: string }> {
    const existingIndex = this.inMemoryLabTechnicians.findIndex((t) => t.id === id);
    if (existingIndex === -1) {
      throw new NotFoundException('Lab technician not found');
    }
    
    const existing = this.inMemoryLabTechnicians[existingIndex];
    let newEmail = existing.email;
    
    if (input.email) {
      newEmail = input.email.trim().toLowerCase();
      if (newEmail !== existing.email) {
        const emailExists = this.inMemoryLabTechnicians.find(t => t.email.toLowerCase() === newEmail && t.id !== id);
        if (emailExists) {
          throw new ConflictException('A lab technician with this email already exists');
        }
      }
    }

    const updatedRecord: LabTechnicianRecord = {
      ...existing,
      name: input.name ? input.name.trim() : existing.name,
      email: newEmail,
    };
    if (input.password) {
      updatedRecord.password = input.password;
    }
    if (input.branchId) {
      updatedRecord.branchId = input.branchId;
    }

    try {
      const dbTech = await this.labTechnicianRepository.findOneBy({ id });
      if (dbTech) {
        if (input.name) dbTech.name = input.name.trim();
        if (input.email) dbTech.email = newEmail;
        if (input.password) dbTech.password = input.password;
        if (input.branchId) dbTech.branchId = input.branchId;
        await this.labTechnicianRepository.save(dbTech);
      }
    } catch (_) {}

    this.inMemoryLabTechnicians[existingIndex] = updatedRecord;

    return {
      id: updatedRecord.id,
      name: updatedRecord.name,
      email: updatedRecord.email,
      role: 'labtech',
      branchId: updatedRecord.branchId,
    };
  }

  async remove(id: string): Promise<void> {
    const existingIndex = this.inMemoryLabTechnicians.findIndex((t) => t.id === id);
    if (existingIndex === -1) {
      throw new NotFoundException('Lab technician not found');
    }

    try {
      await this.labTechnicianRepository.delete(id);
    } catch (_) {}

    this.inMemoryLabTechnicians.splice(existingIndex, 1);
  }
}
