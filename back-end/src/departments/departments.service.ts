import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestContextService } from '../common/request-context.service';
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
    private readonly requestContextService: RequestContextService,
  ) {}

  private getScopedBranchId(): string | undefined {
    return this.requestContextService.getContext()?.branchId;
  }

  private ensureBranchAccess(branchId: string): void {
    const scopedBranchId = this.getScopedBranchId();
    if (scopedBranchId && branchId !== scopedBranchId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
  }

  async create(input: CreateDepartmentDto): Promise<Department> {
    const scopedBranchId = this.getScopedBranchId();
    const requestedBranchId = input.branchId?.trim();
    const branchId = scopedBranchId ?? requestedBranchId;

    if (scopedBranchId && requestedBranchId && requestedBranchId !== scopedBranchId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }

    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    const branch = await this.hospitalBranchService.findOne(branchId);
    const department = this.departmentsRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      branchId,
      branch,
    });
    return this.departmentsRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    const scopedBranchId = this.getScopedBranchId();
    const departments = await this.departmentsRepository.find({ relations: { branch: true }, order: { name: 'ASC' } });
    return scopedBranchId ? departments.filter((department) => department.branchId === scopedBranchId) : departments;
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id }, relations: { branch: true } });
    if (!department) throw new NotFoundException('Department not found');

    this.ensureBranchAccess(department.branchId);
    return department;
  }

  async update(id: string, input: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    if (input.name !== undefined) department.name = input.name.trim();
    if (input.description !== undefined) department.description = input.description.trim();
    if (input.branchId !== undefined) {
      const branchId = input.branchId.trim();
      if (!branchId) {
        throw new BadRequestException('branchId is required');
      }

      this.ensureBranchAccess(branchId);
      department.branch = await this.hospitalBranchService.findOne(branchId);
      department.branchId = branchId;
    }
    return this.departmentsRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    await this.departmentsRepository.remove(await this.findOne(id));
  }
}
