import { ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentEntity } from '../appointments/entities/appointment.entity';
import { DoctorEntity } from '../doctors/entities/doctor.entity';
import { FrontdeskEntity } from '../frontdesk/entities/frontdesk.entity';
import { LabTechnician } from '../lab-technicians/entities/lab-technician.entity';
import { LabRequestsService } from '../lab-requests/lab-requests.service';
import { LabTestsService } from '../labtests/labtests.service';
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
    @Inject(forwardRef(() => LabRequestsService))
    private readonly labRequestsService: LabRequestsService,
    @Inject(forwardRef(() => LabTestsService))
    private readonly labTestsService: LabTestsService,
  ) {}

  private normalizeLabTestName(name: string) {
    return String(name || '').trim().toLowerCase();
  }

  private getLabTestPriceByName(name: string): number {
    const target = this.normalizeLabTestName(name);
    if (!target) return 0;
    const test = this.labTestsService.findAllTests().find((item) => this.normalizeLabTestName(item.name) === target);
    return test?.price ?? 500;
  }

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
    const [branches, completedAppointments, doctors, reports] = await Promise.all([
      this.hospitalBranchRepository.find({ order: { createdAt: 'DESC' } }),
      this.appointmentRepository.find({ where: { status: 'completed' }, relations: ['branch'] }),
      this.doctorRepository.find(),
      Promise.resolve(this.labRequestsService.findAllReports()),
    ]);

    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor] as const));
    const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const labEntries = reports
      .filter((report) => report.status === 'submitted')
      .map((report) => {
        const branch = branchMap.get(report.branchId);
        const submittedAt = report.submittedAt || report.updatedAt || report.createdAt || new Date().toISOString();
        return {
          reportId: report.id,
          labRequestId: report.labRequestId,
          branchId: report.branchId,
          branchName: branch?.branchName ?? 'Unknown Branch',
          hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
          testName: report.testName,
          patientName: report.patientName || report.patientId,
          testPrice: this.getLabTestPriceByName(report.testName),
          date: submittedAt,
          technicianName: report.technicianName || 'Lab Technician',
        };
      });

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

    const currentMonthLabEntries = labEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });

    const sum = (items: typeof entries, key: 'consultationFee' | 'doctorEarning' | 'branchProfit') =>
      items.reduce((total, item) => total + item[key], 0);
    const labSum = (items: typeof labEntries) => items.reduce((total, item) => total + item.testPrice, 0);

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
          totalLabTestRevenue: 0,
          currentMonthLabTestRevenue: 0,
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
        totalLabTestRevenue: number;
        currentMonthLabTestRevenue: number;
      }>()),
    ).map(([, summary]) => summary).sort((a, b) => b.totalRevenue - a.totalRevenue);

    for (const labEntry of labEntries) {
      const key = labEntry.branchId || 'unknown';
      const branch = branchMap.get(labEntry.branchId);
      const current = branchSummaries.find((summary) => summary.branchId === key);
      if (current) {
        current.totalRevenue += labEntry.testPrice;
        current.branchProfit += labEntry.testPrice;
        current.totalLabTestRevenue += labEntry.testPrice;
        const entryDate = new Date(labEntry.date);
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          current.currentMonthRevenue += labEntry.testPrice;
          current.currentMonthLabTestRevenue += labEntry.testPrice;
        }
        continue;
      }

      branchSummaries.push({
        branchId: labEntry.branchId,
        hospitalName: branch?.hospitalName ?? 'Unknown Hospital',
        branchName: branch?.branchName ?? 'Unknown Branch',
        completedAppointmentsCount: 0,
        totalRevenue: labEntry.testPrice,
        currentMonthRevenue: 0,
        totalDoctorCuts: 0,
        branchProfit: labEntry.testPrice,
        totalLabTestRevenue: labEntry.testPrice,
        currentMonthLabTestRevenue: 0,
      });
    }

    branchSummaries.sort((a, b) => b.totalRevenue - a.totalRevenue);

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

    const recentLabPayments = [...labEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((entry) => ({
        reportId: entry.reportId,
        labRequestId: entry.labRequestId,
        branchId: entry.branchId,
        branchName: entry.branchName,
        hospitalName: entry.hospitalName,
        testName: entry.testName,
        patientName: entry.patientName,
        testPrice: entry.testPrice,
        date: entry.date,
        technicianName: entry.technicianName,
      }));

    const totalLabTestRevenue = labSum(labEntries);
    const currentMonthLabTestRevenue = labSum(currentMonthLabEntries);

    return {
      totalRevenue: sum(entries, 'consultationFee'),
      totalDoctorCuts: sum(entries, 'doctorEarning'),
      totalBranchProfit: sum(entries, 'branchProfit') + totalLabTestRevenue,
      currentMonthRevenue: sum(currentMonthEntries, 'consultationFee') + currentMonthLabTestRevenue,
      currentMonthDoctorCuts: sum(currentMonthEntries, 'doctorEarning'),
      currentMonthBranchProfit: sum(currentMonthEntries, 'branchProfit') + currentMonthLabTestRevenue,
      completedAppointmentsCount: entries.length,
      completedLabTestsCount: labEntries.length,
      totalBranchesWithRevenue: branchSummaries.length,
      branches: branchSummaries,
      recentPayments,
      recentLabPayments,
      totalLabTestRevenue,
      currentMonthLabTestRevenue,
      entries,
      labEntries,
      totalEarnings: sum(entries, 'consultationFee'),
      thisMonthEarnings: sum(currentMonthEntries, 'consultationFee') + currentMonthLabTestRevenue,
    };
  }

  async getBranchEarnings(branchId: string) {
    const branch = await this.findOne(branchId);
    const [completedAppointments, doctors, reports] = await Promise.all([
      this.appointmentRepository.find({ where: { branchId, status: 'completed' }, relations: ['branch'] }),
      this.doctorRepository.find({ where: { branchId } }),
      Promise.resolve(this.labRequestsService.findAllReports()),
    ]);

    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor] as const));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const labEntries = reports
      .filter((report) => report.status === 'submitted' && report.branchId === branchId)
      .map((report) => ({
        reportId: report.id,
        labRequestId: report.labRequestId,
        date: report.submittedAt || report.updatedAt || report.createdAt || new Date().toISOString(),
        patientName: report.patientName || report.patientId,
        patientId: report.patientId,
        branchId: report.branchId,
        branchName: branch.branchName,
        hospitalName: branch.hospitalName,
        testName: report.testName,
        testPrice: this.getLabTestPriceByName(report.testName),
        technicianName: report.technicianName || 'Lab Technician',
      }));

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

    const currentMonthLabEntries = labEntries.filter((entry) => {
      const date = new Date(entry.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const currentMonthEntries = entries.filter((entry) => {
      const date = new Date(`${entry.date}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const appointmentRevenue = entries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const totalDoctorCuts = entries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const appointmentBranchProfit = entries.reduce((sum, entry) => sum + entry.branchProfit, 0);
    const totalLabTestRevenue = labEntries.reduce((sum, entry) => sum + entry.testPrice, 0);
    const totalRevenue = appointmentRevenue + totalLabTestRevenue;
    const branchProfit = appointmentBranchProfit + totalLabTestRevenue;
    const currentMonthRevenue = currentMonthEntries.reduce((sum, entry) => sum + entry.consultationFee, 0);
    const currentMonthDoctorCuts = currentMonthEntries.reduce((sum, entry) => sum + entry.doctorEarning, 0);
    const currentMonthAppointmentProfit = currentMonthEntries.reduce((sum, entry) => sum + entry.branchProfit, 0);
    const currentMonthLabTestRevenue = currentMonthLabEntries.reduce((sum, entry) => sum + entry.testPrice, 0);
    const currentMonthProfit = currentMonthAppointmentProfit + currentMonthLabTestRevenue;

    return {
      branch,
      totalRevenue,
      totalDoctorCuts,
      branchProfit,
      currentMonthRevenue: currentMonthRevenue + currentMonthLabTestRevenue,
      currentMonthDoctorCuts,
      currentMonthProfit,
      completedAppointmentsCount: entries.length,
      completedLabTestsCount: labEntries.length,
      totalLabTestRevenue,
      currentMonthLabTestRevenue,
      entries,
      labEntries,
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
