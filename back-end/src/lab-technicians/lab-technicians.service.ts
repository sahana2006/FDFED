import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { CreateLabTechnicianDto } from './dto/create-lab-technician.dto';
import { LabTechnician } from './entities/lab-technician.entity';

@Injectable()
export class LabTechniciansService {
  constructor(
    @InjectRepository(LabTechnician)
    private readonly labTechnicianRepository: Repository<LabTechnician>,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  async create(input: CreateLabTechnicianDto): Promise<LabTechnician> {
    await this.hospitalBranchService.findOne(input.branchId);
    const email = input.email.trim().toLowerCase();
    if (await this.labTechnicianRepository.findOneBy({ email })) {
      throw new ConflictException('A lab technician with this email already exists');
    }

    return this.labTechnicianRepository.save(
      this.labTechnicianRepository.create({
        name: input.name.trim(),
        email,
        password: input.password,
        branchId: input.branchId,
      }),
    );
  }

  findByEmail(email: string): Promise<LabTechnician | null> {
    return this.labTechnicianRepository.findOneBy({ email: email.trim().toLowerCase() });
  }

  async findOne(id: string): Promise<LabTechnician> {
    const technician = await this.labTechnicianRepository.findOneBy({ id });
    if (!technician) throw new NotFoundException('Lab technician not found');
    return technician;
  }
}
