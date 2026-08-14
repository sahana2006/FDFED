import { Injectable } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { DoctorsService } from '../doctors/doctors.service';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { PatientsService } from '../patients/patients.service';
import { UsersService } from '../users/users.service';

export type SuperAdminDashboardBranchRow = {
  id: string;
  hospitalName: string;
  branchName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  status: string;
  totalDoctors: number;
  totalPatients: number | null;
  totalAppointments: number;
  branchAdmin: {
    userId: string;
    name: string;
    email: string;
    phone: string;
  } | null;
};

@Injectable()
export class SuperAdminDashboardService {
  constructor(
    private readonly hospitalBranchService: HospitalBranchService,
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
  ) {}

  async getDashboardSnapshot(): Promise<{
    summary: {
      totalBranches: number;
      activeBranches: number;
      inactiveBranches: number;
      totalDoctors: number;
      totalPatients: number;
      todaysAppointments: number;
      totalAppointments: number;
    };
    branches: SuperAdminDashboardBranchRow[];
  }> {
    const branches = await this.hospitalBranchService.findAll();
    const doctors = await this.doctorsService.findAll();
    const patients = this.patientsService.getAllPatients();
    const appointments = await this.appointmentsService.listAppointments();
    const branchAdmins = await this.usersService.listBranchAdminSummaries();
    const branchAdminMap = new Map(branchAdmins.map((admin) => [admin.branchId, admin] as const));

    const today = new Date().toISOString().split('T')[0];
    const branchDoctorCounts = this.countByBranch(doctors);
    const branchAppointmentCounts = this.countByBranch(appointments);

    const branchRows = branches.map((branch) => {
      const admin = branchAdminMap.get(branch.id);
      return {
        id: branch.id,
        hospitalName: branch.hospitalName,
        branchName: branch.branchName,
        address: branch.address,
        city: branch.city,
        state: branch.state,
        pincode: branch.pincode,
        phone: branch.phone,
        email: branch.email,
        status: branch.status,
        totalDoctors: branchDoctorCounts.get(branch.id) ?? 0,
        totalPatients: null,
        totalAppointments: branchAppointmentCounts.get(branch.id) ?? 0,
        branchAdmin: admin
          ? {
              userId: admin.userId,
              name: admin.name,
              email: admin.email,
              phone: admin.phone,
            }
          : null,
      };
    });

    return {
      summary: {
        totalBranches: branches.length,
        activeBranches: branches.filter((branch) => branch.status === 'active').length,
        inactiveBranches: branches.filter((branch) => branch.status !== 'active').length,
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        todaysAppointments: appointments.filter((appointment) => appointment.date === today).length,
        totalAppointments: appointments.length,
      },
      branches: branchRows,
    };
  }

  private countByBranch<T extends { branchId?: string }>(items: T[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
      const branchId = item.branchId?.trim();
      if (!branchId) continue;
      counts.set(branchId, (counts.get(branchId) ?? 0) + 1);
    }
    return counts;
  }
}
