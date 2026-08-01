import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  async create(input: CreateDepartmentDto): Promise<Department> {
    const branchId = input.branchId.trim();
    const branch = await this.hospitalBranchService.findOne(branchId);
    const department = this.departmentsRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      branchId,
      branch,
    });
    return this.departmentsRepository.save(department);
  }

  findAll(): Promise<Department[]> {
    return this.departmentsRepository.find({ relations: { branch: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id }, relations: { branch: true } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(id: string, input: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    if (input.name !== undefined) department.name = input.name.trim();
    if (input.description !== undefined) department.description = input.description.trim();
    if (input.branchId !== undefined) {
      const branchId = input.branchId.trim();
      department.branch = await this.hospitalBranchService.findOne(branchId);
      department.branchId = branchId;
    }
    return this.departmentsRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    await this.departmentsRepository.remove(await this.findOne(id));
  }
}
