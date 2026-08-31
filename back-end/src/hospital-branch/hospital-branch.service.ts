import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentEntity } from '../appointments/entities/appointment.entity';
import { DoctorEntity } from '../doctors/entities/doctor.entity';
import { FrontdeskEntity } from '../frontdesk/entities/frontdesk.entity';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { PatientsService } from '../patients/patients.service';
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
    private readonly patientsService: PatientsService,
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
    const [branches, completedAppointments, doctors] = await Promise.all([
      this.hospitalBranchRepository.find({ order: { createdAt: 'DESC' } }),
      this.appointmentRepository.find({ where: { status: 'completed' }, relations: ['branch'] }),
      this.doctorRepository.find(),
    ]);

    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor] as const));
    const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const entries = completedAppointments.map((appointment) => {
      const doctor = doctorMap.get(appointment.doctorId);
      const branch = appointment.branch ?? branchMap.get(appointment.branchId);
      const consultationFee = doctor?.consultationFee ?? 0;
      const doctorEarning = consultationFee * ((doctor?.percentageCut ?? 0) / 100);
      const branchProfit = consultationFee - doctorEarning;
      const appointmentDate = new Date(appointment.date);
      const isCurrentMonth =
        !Number.isNaN(appointmentDate.getTime()) &&
        appointmentDate.getMonth() === currentMonth &&
        appointmentDate.getFullYear() === currentYear;

      return {
        appointmentId: appointment.id,
        branchId: appointment.branchId,
        hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
        branchName: branch?.branchName ?? 'Unknown Branch',
        date: appointment.date,
        slot: appointment.slot,
        doctorId: appointment.doctorId,
        doctorName: doctor?.name ?? 'Unknown Doctor',
        consultationFee,
        doctorEarning,
        branchProfit,
        isCurrentMonth,
      };
    });

    const sum = (items: typeof entries, key: 'consultationFee' | 'doctorEarning' | 'branchProfit') =>
      items.reduce((total, item) => total + item[key], 0);

    const currentMonthEntries = entries.filter((entry) => entry.isCurrentMonth);
    const branchSummaries = Array.from(
      entries.reduce((acc, entry) => {
        const key = entry.branchId || 'unknown';
        const current = acc.get(key) ?? {
          branchId: entry.branchId,
          hospitalName: entry.hospitalName,
          branchName: entry.branchName,
          completedAppointmentsCount: 0,
          totalRevenue: 0,
          currentMonthRevenue: 0,
          totalDoctorCuts: 0,
          branchProfit: 0,
        };

        current.completedAppointmentsCount += 1;
        current.totalRevenue += entry.consultationFee;
        current.totalDoctorCuts += entry.doctorEarning;
        current.branchProfit += entry.branchProfit;
        if (entry.isCurrentMonth) {
          current.currentMonthRevenue += entry.consultationFee;
        }

        acc.set(key, current);
        return acc;
      }, new Map<string, {
        branchId: string;
        hospitalName: string;
        branchName: string;
        completedAppointmentsCount: number;
        totalRevenue: number;
        currentMonthRevenue: number;
        totalDoctorCuts: number;
        branchProfit: number;
      }>()),
    ).map(([, summary]) => summary).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const recentPayments = [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((entry) => ({
        appointmentId: entry.appointmentId,
        branchId: entry.branchId,
        branchName: entry.branchName,
        hospitalName: entry.hospitalName,
        doctorName: entry.doctorName,
        date: entry.date,
        slot: entry.slot,
        consultationFee: entry.consultationFee,
        doctorEarning: entry.doctorEarning,
        branchProfit: entry.branchProfit,
      }));

    return {
      totalRevenue: sum(entries, 'consultationFee'),
      totalDoctorCuts: sum(entries, 'doctorEarning'),
      totalBranchProfit: sum(entries, 'branchProfit'),
      currentMonthRevenue: sum(currentMonthEntries, 'consultationFee'),
      currentMonthDoctorCuts: sum(currentMonthEntries, 'doctorEarning'),
      currentMonthBranchProfit: sum(currentMonthEntries, 'branchProfit'),
      completedAppointmentsCount: entries.length,
      totalBranchesWithRevenue: branchSummaries.length,
      branches: branchSummaries,
      recentPayments,
      totalEarnings: sum(entries, 'consultationFee'),
      thisMonthEarnings: sum(currentMonthEntries, 'consultationFee'),
    };
  }

  async getBranchEarnings(branchId: string) {
    const branch = await this.findOne(branchId);
    const [completedAppointments, doctors] = await Promise.all([
      this.appointmentRepository.find({ where: { branchId, status: 'completed' }, relations: ['branch'] }),
      this.doctorRepository.find({ where: { branchId } }),
    ]);

    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor] as const));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const entries = completedAppointments.map((appointment) => {
      const doctor = doctorMap.get(appointment.doctorId);
      const fee = doctor?.consultationFee ?? 0;
      const cut = doctor?.percentageCut ?? 0;
      const doctorEarning = (fee * cut) / 100;
      const branchProfit = fee - doctorEarning;

      let patientName = appointment.userId;
      try {
        const patient = this.patientsService.getPatientByUserId(appointment.userId);
        patientName = `${patient.firstName} ${patient.lastName}`.trim() || appointment.userId;
      } catch (_error) {}

      return {
        appointmentId: appointment.id,
        date: appointment.date,
        slot: appointment.slot,
        patientName,
        doctorId: doctor?.id ?? appointment.doctorId,
        doctorName: doctor?.name ?? 'Unknown Doctor',
        consultationFee: fee,
        percentageCut: cut,
        doctorEarning,
        branchProfit,
      };
    });

    const currentMonthEntries = entries.filter((entry) => {
      const date = new Date(`${entry.date}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalRevenue = entries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const totalDoctorCuts = entries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const branchProfit = entries.reduce((sum, entry) => sum + entry.branchProfit, 0);
    const currentMonthRevenue = currentMonthEntries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const currentMonthDoctorCuts = currentMonthEntries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const currentMonthProfit = currentMonthEntries.reduce((sum, entry) => sum + entry.branchProfit, 0);

    return {
      branch,
      totalRevenue,
      totalDoctorCuts,
      branchProfit,
      currentMonthRevenue,
      currentMonthDoctorCuts,
      currentMonthProfit,
      completedAppointmentsCount: entries.length,
      entries,
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
