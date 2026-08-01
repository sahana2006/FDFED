import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';
import { UsersService } from '../users/users.service';

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

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class FrontdeskService {
  private readonly frontdesks: Frontdesk[] = [
    {
      userId: 'FD001',
      branchId: DEFAULT_BRANCH_ID,
      name: 'Priya Nair',
      email: 'frontdesk@medbits.com',
      phone: '9876541010',
      gender: 'Female',
      reportingManagerId: 'ADM001',
      languages: ['English', 'Hindi'],
      counter: '1',
      shiftStart: '09:00',
      shiftEnd: '17:00',
    },
  ];

  constructor(
    private readonly usersService: UsersService,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  findAll(): Frontdesk[] {
    return this.frontdesks.map((frontdesk) => ({
      ...frontdesk,
      languages: [...frontdesk.languages],
    }));
  }

  getFrontdeskByUserId(userId: string): Frontdesk {
    const frontdesk = this.frontdesks.find((item) => item.userId === userId);
    if (!frontdesk) {
      throw new NotFoundException('Frontdesk profile not found');
    }

    return { ...frontdesk, languages: [...frontdesk.languages] };
  }

  async createFrontdesk(input: CreateFrontdeskInput): Promise<Frontdesk> {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const branchId = input.branchId?.trim();

    if (!name || !email || !input.password) {
      throw new BadRequestException('name, email and password are required');
    }
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    const branch = await this.hospitalBranchService.findOne(branchId);

    const user = this.usersService.createFrontdeskUser({
      name,
      email,
      password: input.password,
    });

    const frontdesk: Frontdesk = {
      userId: user.id,
      branchId,
      branch,
      name: user.name,
      email: user.email,
      phone: input.phone?.trim() || '',
      gender: input.gender?.trim() || '',
      reportingManagerId: input.reportingManagerId?.trim() || '',
      languages: this.normalizeLanguages(input.languages),
      counter: input.counter?.trim() || '',
      shiftStart: input.shiftStart?.trim() || '',
      shiftEnd: input.shiftEnd?.trim() || '',
    };

    this.frontdesks.push(frontdesk);
    return { ...frontdesk, languages: [...frontdesk.languages] };
  }

  async updateFrontdesk(userId: string, input: UpdateFrontdeskInput): Promise<Frontdesk> {
    const frontdesk = this.frontdesks.find((item) => item.userId === userId);
    if (!frontdesk) {
      throw new NotFoundException('Frontdesk profile not found');
    }

    const nextName = input.name?.trim();
    const nextEmail = input.email?.trim();
    if (nextName || nextEmail) {
      const user = this.usersService.updateFrontdeskUser(userId, {
        name: nextName,
        email: nextEmail,
      });
      frontdesk.name = user.name;
      frontdesk.email = user.email;
    }

    if (input.branchId !== undefined) {
      const branchId = input.branchId.trim();
      if (!branchId) {
        throw new BadRequestException('branchId is required');
      }
      frontdesk.branchId = branchId;
      frontdesk.branch = await this.hospitalBranchService.findOne(branchId);
    }

    if (input.phone !== undefined) frontdesk.phone = input.phone.trim();
    if (input.gender !== undefined) frontdesk.gender = input.gender.trim();
    if (input.reportingManagerId !== undefined) {
      frontdesk.reportingManagerId = input.reportingManagerId.trim();
    }
    if (input.languages !== undefined) {
      frontdesk.languages = this.normalizeLanguages(input.languages);
    }
    if (input.counter !== undefined) frontdesk.counter = input.counter.trim();
    if (input.shiftStart !== undefined) {
      frontdesk.shiftStart = input.shiftStart.trim();
    }
    if (input.shiftEnd !== undefined) {
      frontdesk.shiftEnd = input.shiftEnd.trim();
    }

    return { ...frontdesk, languages: [...frontdesk.languages] };
  }

  private normalizeLanguages(languages?: string[]): string[] {
    if (!Array.isArray(languages)) return [];
    return [...new Set(languages.map((item) => item?.trim()).filter(Boolean))];
  }
}
