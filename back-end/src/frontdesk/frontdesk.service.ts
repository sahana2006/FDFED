import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';
import { UsersService } from '../users/users.service';
import { RequestContextService } from '../common/request-context.service';
import { FrontdeskEntity } from './entities/frontdesk.entity';

export type Frontdesk = {
  userId: string;
  branchId: string;
  branch?: HospitalBranch;
  name: string;
  email: string;
  phone: string;
  gender: string;
  reportingManagerId: string;
  languages: string[];
  counter: string;
  shiftStart: string;
  shiftEnd: string;
};

export type CreateFrontdeskInput = {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone?: string;
  gender?: string;
  reportingManagerId?: string;
  languages?: string[];
  counter?: string;
  shiftStart?: string;
  shiftEnd?: string;
};

export type UpdateFrontdeskInput = Partial<Omit<CreateFrontdeskInput, 'password'>>;

/** Map a FrontdeskEntity row to the plain Frontdesk DTO */
function toFrontdesk(e: FrontdeskEntity): Frontdesk {
  return {
    userId: e.userId,
    branchId: e.branchId,
    name: e.name,
    email: e.email,
    phone: e.phone,
    gender: e.gender,
    reportingManagerId: e.reportingManagerId,
    languages: Array.isArray(e.languages) ? [...e.languages] : [],
    counter: e.counter,
    shiftStart: e.shiftStart,
    shiftEnd: e.shiftEnd,
  };
}

@Injectable()
export class FrontdeskService {
  constructor(
    @InjectRepository(FrontdeskEntity)
    private readonly frontdeskRepository: Repository<FrontdeskEntity>,
    private readonly usersService: UsersService,
    private readonly hospitalBranchService: HospitalBranchService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private getScopedBranchId(): string | undefined {
    return this.requestContextService.getContext()?.branchId;
  }

  async findAll(): Promise<Frontdesk[]> {
    const scopedBranchId = this.getScopedBranchId();
    const where: Record<string, unknown> = { isActive: true };
    if (scopedBranchId) where.branchId = scopedBranchId;
    const rows = await this.frontdeskRepository.find({ where });
    return rows.map(toFrontdesk);
  }

  async getFrontdeskByUserId(userId: string): Promise<Frontdesk> {
    const row = await this.frontdeskRepository.findOneBy({ userId });
    if (!row) throw new NotFoundException('Frontdesk profile not found');
    return toFrontdesk(row);
  }

  async createFrontdesk(input: CreateFrontdeskInput): Promise<Frontdesk> {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const branchId = input.branchId?.trim();

    if (!name || !email || !input.password) {
      throw new BadRequestException('name, email and password are required');
    }
    if (!branchId) throw new BadRequestException('branchId is required');

    await this.hospitalBranchService.findOne(branchId);

    const user = this.usersService.createFrontdeskUser({ name, email, password: input.password });

    const entity = this.frontdeskRepository.create({
      userId: user.id,
      branchId,
      name: user.name,
      email: user.email,
      phone: input.phone?.trim() || '',
      gender: input.gender?.trim() || '',
      reportingManagerId: input.reportingManagerId?.trim() || '',
      languages: this.normalizeLanguages(input.languages),
      counter: input.counter?.trim() || '',
      shiftStart: input.shiftStart?.trim() || '',
      shiftEnd: input.shiftEnd?.trim() || '',
    });

    const saved = await this.frontdeskRepository.save(entity);
    return toFrontdesk(saved);
  }

  async updateFrontdesk(userId: string, input: UpdateFrontdeskInput): Promise<Frontdesk> {
    const row = await this.frontdeskRepository.findOneBy({ userId });
    if (!row) throw new NotFoundException('Frontdesk profile not found');

    const nextName = input.name?.trim();
    const nextEmail = input.email?.trim();
    if (nextName || nextEmail) {
      const user = this.usersService.updateFrontdeskUser(userId, { name: nextName, email: nextEmail });
      row.name = user.name;
      row.email = user.email;
    }

    if (input.branchId !== undefined) {
      const branchId = input.branchId.trim();
      if (!branchId) throw new BadRequestException('branchId is required');
      await this.hospitalBranchService.findOne(branchId);
      row.branchId = branchId;
    }

    if (input.phone !== undefined) row.phone = input.phone.trim();
    if (input.gender !== undefined) row.gender = input.gender.trim();
    if (input.reportingManagerId !== undefined) row.reportingManagerId = input.reportingManagerId.trim();
    if (input.languages !== undefined) row.languages = this.normalizeLanguages(input.languages);
    if (input.counter !== undefined) row.counter = input.counter.trim();
    if (input.shiftStart !== undefined) row.shiftStart = input.shiftStart.trim();
    if (input.shiftEnd !== undefined) row.shiftEnd = input.shiftEnd.trim();

    const saved = await this.frontdeskRepository.save(row);
    return toFrontdesk(saved);
  }

  async removeFrontdesk(userId: string): Promise<void> {
    const row = await this.frontdeskRepository.findOneBy({ userId, isActive: true });
    if (!row) throw new NotFoundException('Frontdesk profile not found');
    row.isActive = false;
    await this.frontdeskRepository.save(row);
  }

  private normalizeLanguages(languages?: string[]): string[] {
    if (!Array.isArray(languages)) return [];
    return [...new Set(languages.map((item) => item?.trim()).filter(Boolean))];
  }
}
