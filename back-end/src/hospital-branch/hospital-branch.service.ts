import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentEntity } from '../appointments/entities/appointment.entity';
import { DoctorEntity } from '../doctors/entities/doctor.entity';
import { FrontdeskEntity } from '../frontdesk/entities/frontdesk.entity';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { CreateHospitalBranchDto } from './dto/create-hospital-branch.dto';
import { UpdateHospitalBranchDto } from './dto/update-hospital-branch.dto';
import { HospitalBranch } from './entities/hospital-branch.entity';

@Injectable()
export class HospitalBranchService {
  constructor(
    @InjectRepository(HospitalBranch)
    private readonly hospitalBranchRepository: Repository<HospitalBranch>,
    @InjectRepository(DoctorEntity)
    private readonly doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(FrontdeskEntity)
    private readonly frontdeskRepository: Repository<FrontdeskEntity>,
    @InjectRepository(LabTechnician)
    private readonly labTechnicianRepository: Repository<LabTechnician>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
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

  async getEarnings() {
    return {
      totalEarnings: 0,
      thisMonthEarnings: 0,
      recentPayments: [],
    };
  }

  async getBranchStatistics(branchId: string) {
    const branch = await this.findOne(branchId);
    const [doctors, frontdesk, labTechnicians, appointments] = await Promise.all([
      this.doctorRepository.find({ where: { branchId, isActive: true } }),
      this.frontdeskRepository.find({ where: { branchId, isActive: true } }),
      this.labTechnicianRepository.find({ where: { branchId } }),
      this.appointmentRepository.find({ where: { branchId } }),
    ]);

    const safeDoctors = doctors.map((doctor) => ({
      id: doctor.id,
      userId: doctor.userId,
      name: doctor.name,
      specialization: doctor.specialization,
      branchId: doctor.branchId,
      department: doctor.department,
      qualification: doctor.qualification,
      experience: doctor.experience,
      age: doctor.age,
      gender: doctor.gender,
      email: doctor.email,
      phone: doctor.phone,
      licenseNo: doctor.licenseNo,
      bio: doctor.bio,
      slots: Array.isArray(doctor.slots) ? [...doctor.slots] : [],
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }));

    const safeFrontdesk = frontdesk.map((staff) => ({
      userId: staff.userId,
      branchId: staff.branchId,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      gender: staff.gender,
      reportingManagerId: staff.reportingManagerId,
      languages: Array.isArray(staff.languages) ? [...staff.languages] : [],
      counter: staff.counter,
      shiftStart: staff.shiftStart,
      shiftEnd: staff.shiftEnd,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    }));

    const safeLabTechnicians = labTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      email: tech.email,
      branchId: tech.branchId,
      createdAt: tech.createdAt,
      updatedAt: tech.updatedAt,
    }));

    return {
      branch,
      summary: {
        totalDoctors: safeDoctors.length,
        totalAppointments: appointments.length,
        totalFrontdesks: safeFrontdesk.length,
        totalLabTechnicians: safeLabTechnicians.length,
      },
      doctors: safeDoctors,
      frontdesk: safeFrontdesk,
      labTechnicians: safeLabTechnicians,
    };
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
