import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateHospitalBranchDto } from './dto/create-hospital-branch.dto';
import { UpdateHospitalBranchDto } from './dto/update-hospital-branch.dto';
import { HospitalBranch } from './entities/hospital-branch.entity';

@Injectable()
export class HospitalBranchService {
  constructor(
    @InjectRepository(HospitalBranch)
    private readonly hospitalBranchRepository: Repository<HospitalBranch>,
  ) {}

  async create(createHospitalBranchDto: CreateHospitalBranchDto): Promise<HospitalBranch> {
    const email = createHospitalBranchDto.email.trim().toLowerCase();
    const existingBranch = await this.hospitalBranchRepository.findOneBy({ email });
    if (existingBranch) {
      throw new ConflictException('A hospital branch with this email already exists');
    }

    const branch = this.hospitalBranchRepository.create({
      ...this.cleanTextFields(createHospitalBranchDto),
      email,
    });
    return this.hospitalBranchRepository.save(branch);
  }

  findAll(): Promise<HospitalBranch[]> {
    return this.hospitalBranchRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<HospitalBranch> {
    const branch = await this.hospitalBranchRepository.findOneBy({ id });
    if (!branch) {
      throw new NotFoundException('Hospital branch not found');
    }
    return branch;
  }

  async update(id: string, updateHospitalBranchDto: UpdateHospitalBranchDto): Promise<HospitalBranch> {
    const branch = await this.findOne(id);
    const update = this.cleanTextFields(updateHospitalBranchDto);

    if (update.email !== undefined) {
      update.email = update.email.toLowerCase();
      const existingBranch = await this.hospitalBranchRepository.findOneBy({ email: update.email });
      if (existingBranch && existingBranch.id !== id) {
        throw new ConflictException('A hospital branch with this email already exists');
      }
    }

    Object.assign(branch, update);
    return this.hospitalBranchRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    await this.hospitalBranchRepository.remove(branch);
  }

  private cleanTextFields(
    dto: Partial<CreateHospitalBranchDto>,
  ): Partial<CreateHospitalBranchDto> {
    const cleaned = { ...dto };
    const textFields: Array<keyof CreateHospitalBranchDto> = [
      'hospitalName',
      'branchName',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'email',
    ];

    for (const field of textFields) {
      const value = cleaned[field] as string | undefined;
      if (typeof value === 'string') {
        (cleaned as Record<string, unknown>)[field] = value.trim();
      }
    }
    return cleaned;
  }
}
